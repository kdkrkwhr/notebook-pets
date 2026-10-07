import asyncio
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import struct
import threading
import unittest
from unittest.mock import patch
import zlib
import test_p0
from test_engine import base_state
import art
import engine
from comfy_images import ComfyUIProvider, build_workflow
from image_service import ImageService, validate_png
from runtime import GameError, read_json


def fixture_png():
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(b"\0\xff\xff\xff")) + chunk(b"IEND", b""))


class FakeProvider:
    name = "test-provider"
    def __init__(self):
        self.calls = []
    def generate(self, spec, prompt, reference, job_path, *, style_reference=None):
        self.calls.append((spec.copy(), prompt, reference, style_reference))
        return fixture_png()


class ImageTests(unittest.TestCase):
    setUp = test_p0.RuntimeTests.setUp
    seed = test_p0.RuntimeTests.seed

    def service(self, provider=None, curated=False):
        return ImageService(provider, root=self.root / "artwork", examples=None if curated else self.root / "examples")

    def test_prompts_cover_all_combinations_and_final_branches(self):
        for sp in engine.G["species"]:
            for el in engine.G["elements"]:
                for stage in (1, 2, 3, 4):
                    for branch in (("light", "dark") if stage == 4 else (None,)):
                        prompt = art.build_prompt(sp, el, stage, branch, reference=stage > 1)
                        shape = art.TEMPLATE.get("species_stages", {}).get(sp, {}).get(str(stage))
                        if shape:
                            self.assertIn(shape, prompt)
                        else:
                            self.assertIn(art.TEMPLATE["species"][sp], prompt)
                            self.assertIn(art.TEMPLATE["stages"][str(stage)], prompt)
                        self.assertIn(art.TEMPLATE["element_motifs" if branch else "elements"][el], prompt)
                        if stage > 1:
                            self.assertIn("SAME individual", prompt)
        self.assertNotEqual(art.image_key("dragon", "light", 4, "light"), art.image_key("dragon", "light", 4, "dark"))

    def test_legacy_identity_stable_but_reset_changes_identity(self):
        self.seed()
        a = engine.execute("123", "status")["image"]
        self.assertEqual(a, engine.execute("123", "status")["image"])
        engine.execute("999", "reset", ["123", "Reborn"])
        b = engine.execute("123", "status")["image"]
        self.assertNotEqual(a["pet_id"], b["pet_id"])
        self.assertEqual(self.service().render("123", a)["status"], "stale")

    def test_evolution_metadata_in_all_xp_results(self):
        st = base_state(level=30, xp=99)
        result = engine.add_xp(st, 1)
        self.assertEqual(result["image"]["stage"], 2)
        self.assertEqual(result["image"]["key"], "mammal_fire_stage2")

    def test_curated_starter_works_without_server(self):
        self.seed(species="plant", element="nature")
        result = self.service(curated=True).render("123", engine.execute("123", "status")["image"])
        self.assertEqual(result["status"], "ready")
        self.assertEqual(Path(result["path"]).read_bytes(), (art.ROOT / "assets/examples/plant_nature_stage1.png").read_bytes())

    def test_stage_chain_references_previous_image_and_cache_prevents_regeneration(self):
        self.seed(level=81, stage=4, evolution_branch="light")
        provider = FakeProvider()
        service = self.service(provider)
        spec = engine.execute("123", "status")["image"]
        first = service.render("123", spec)
        self.assertEqual(first["status"], "ready")
        self.assertEqual([c[0]["stage"] for c in provider.calls], [1, 2, 3, 4])
        self.assertIsNone(provider.calls[0][2])
        for index, call in enumerate(provider.calls[1:], 1):
            self.assertIn(f"stage{index}", call[2].name)
            self.assertIn("stage1", call[3].name)
        self.assertEqual(service.render("123", spec), first)
        self.assertEqual(len(provider.calls), 4)

    def test_failed_evolution_retries_then_keeps_previous_image_and_progress(self):
        self.seed(species="plant", element="nature", level=31, stage=2)
        provider = FakeProvider()
        with patch.object(provider, "generate", side_effect=GameError("offline", "offline")) as generate:
            result = self.service(provider, curated=True).render("123", engine.execute("123", "status")["image"])
        self.assertEqual(generate.call_count, 3)
        self.assertEqual((result["status"], result["stage"]), ("fallback", 1))
        self.assertTrue(Path(result["path"]).is_file())
        self.assertEqual(engine.load_state("123")["level"], 31)

    def test_generation_does_not_hold_game_lock_or_overwrite_new_gameplay(self):
        self.seed()
        provider = FakeProvider()
        def generate(*args, **kwargs):
            self.assertTrue(engine.execute("123", "snack")["ok"])
            return fixture_png()
        with patch.object(provider, "generate", side_effect=generate):
            result = self.service(provider).render("123", engine.execute("123", "status")["image"])
        self.assertEqual(result["status"], "ready")
        self.assertEqual(engine.load_state("123")["xp"], 5)

    def test_reset_during_generation_discards_late_result(self):
        self.seed()
        provider = FakeProvider()
        def generate(*args, **kwargs):
            engine.execute("999", "reset", ["123", "NewPet"])
            return fixture_png()
        with patch.object(provider, "generate", side_effect=generate):
            result = self.service(provider).render("123", engine.execute("123", "status")["image"])
        self.assertEqual(result["status"], "stale")
        self.assertEqual(list((self.root / "artwork").rglob("*.png")), [])

    def test_invalid_image_bytes_never_replace_valid_prior_stage(self):
        self.seed(species="plant", element="nature", level=31, stage=2)
        provider = FakeProvider()
        with patch.object(provider, "generate", return_value=b"not a png"):
            result = self.service(provider, curated=True).render("123", engine.execute("123", "status")["image"])
        self.assertEqual(result["status"], "fallback")
        validate_png(Path(result["path"]).read_bytes())

    def test_image_requests_respect_owner_gate_and_cannot_choose_paths(self):
        self.seed()
        spec = engine.execute("123", "status")["image"]
        malicious = dict(spec, pet_id="../../outside")
        self.assertEqual(self.service().render("123", malicious)["status"], "stale")
        self.assertEqual(self.service().render("124", spec)["status"], "stale")
        engine.execute("999", "owner", ["124"])
        self.assertEqual(self.service().render("123", spec)["status"], "stale")

    def test_parallel_workers_do_not_generate_same_image_twice(self):
        self.seed()
        service = self.service(FakeProvider())
        spec = engine.execute("123", "status")["image"]
        started, release = threading.Event(), threading.Event()
        def generate(*args, **kwargs):
            started.set()
            if not release.wait(5):
                raise RuntimeError("Worker timeout")
            return fixture_png()
        with patch.object(service.provider, "generate", side_effect=generate) as generate_mock:
            with ThreadPoolExecutor(max_workers=2) as pool:
                first = pool.submit(service.render, "123", spec)
                self.assertTrue(started.wait(2))
                second = pool.submit(service.render, "123", spec)
                try:
                    self.assertEqual(second.result(timeout=2)["status"], "busy")
                finally:
                    release.set()
                self.assertEqual(first.result(timeout=3)["status"], "ready")
            self.assertEqual(generate_mock.call_count, 1)

    def test_workflow_encodes_reference_instead_of_empty_latent(self):
        workflow = build_workflow("evolve", 42, reference_name="previous.png", stage=2)["prompt"]
        self.assertEqual(workflow["10"]["inputs"]["image"], "previous.png")
        self.assertEqual(workflow["3"]["inputs"]["latent_image"], ["12", 0])
        self.assertEqual(workflow["3"]["inputs"]["denoise"], art.render_settings(2, True)["denoise"])
        self.assertEqual(workflow["12"]["inputs"]["pixels"], ["15", 0])
        self.assertEqual(workflow["14"]["inputs"]["mask"], ["10", 1])
        self.assertEqual(workflow["15"]["inputs"]["mask"], ["14", 0])
        self.assertEqual(workflow["13"]["inputs"]["color"], 16777215)
        self.assertNotIn("5", workflow)
        self.assertIn("5", build_workflow("new pet", 42)["prompt"])

    def test_stage_profiles_increase_change_and_species_shapes_are_distinct(self):
        strengths = [art.render_settings(stage, True)["denoise"] for stage in (2, 3, 4)]
        self.assertEqual(strengths, sorted(set(strengths)))
        for species in ("plant", "machine", "ghost", "dragon"):
            self.assertEqual(len(set(art.TEMPLATE["species_stages"][species].values())), 4)
            for stage in (1, 2, 3, 4):
                branch = "light" if stage == 4 else None
                prompt = art.build_prompt(species, "fire", stage, branch)
                self.assertIn(art.TEMPLATE["species_stages"][species][str(stage)], prompt)
        self.assertEqual(art.render_settings(4, False)["denoise"], 1.0)
        self.assertNotIn("cute", art.TEMPLATE["style"])

    def test_cli_dry_run_and_provider_share_final_evolution_settings(self):
        import subprocess
        import sys
        root = Path(__file__).resolve().parents[1]
        result = subprocess.run([sys.executable, "-X", "utf8", str(root / "tools/gen_image.py"),
            "plant", "nature", "ultimate", "samples/dry.png", "42", "--branch", "dark",
            "--reference", str(root / "assets/examples/plant_nature_stage1.png"), "--dry-run"],
            capture_output=True, text=True, encoding="utf-8")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        workflow = json.loads(result.stdout)["workflow"]["prompt"]
        self.assertEqual(workflow["3"]["inputs"]["denoise"], art.render_settings(4, True, "plant")["denoise"])
        self.assertEqual(workflow["13"]["inputs"]["width"], art.TEMPLATE["render"]["width"])

    def test_ghost_preserves_face_with_lower_strength_and_final_branches_keep_element_motifs(self):
        for stage in (2, 3, 4):
            ghost = build_workflow("ghost", 42, reference_name="ghost.png", stage=stage, species="ghost")["prompt"]
            other = art.render_settings(stage, True, "machine")
            self.assertLess(ghost["3"]["inputs"]["denoise"], other["denoise"])
            if stage >= 3:
                self.assertEqual(ghost["15"]["inputs"]["x"], 0)
        prompt = art.build_prompt("ghost", "wind", 4, "dark", True)
        self.assertTrue(prompt.startswith(art.TEMPLATE["species_branches"]["ghost"]["dark"]))
        self.assertIn(art.TEMPLATE["element_motifs"]["wind"], prompt)
        self.assertNotIn(art.TEMPLATE["elements"]["wind"], prompt)

    def test_timeout_reuses_persisted_comfy_job(self):
        provider = ComfyUIProvider(timeout=0.02, poll_interval=0)
        spec = art.describe(base_state())
        job = self.root / "test.job.json"
        def network(route, *args, **kwargs):
            return {"prompt_id": "queued-1"} if route == "/prompt" else {}
        with patch.object(provider, "_http", side_effect=network) as http:
            for _ in range(2):
                with self.assertRaises(GameError) as error:
                    provider.generate(spec, "prompt", None, job)
                self.assertEqual(error.exception.code, "image_timeout")
        self.assertEqual(sum(c.args[0] == "/prompt" for c in http.call_args_list), 1)
        self.assertEqual(read_json(job)["prompt_id"], "queued-1")

    def test_style_anchor_is_separate_from_previous_stage_latent(self):
        wf = build_workflow("mature", 42, reference_name="stage2.png",
                            style_reference_name="stage1.png", species="plant", stage=3)["prompt"]
        self.assertEqual(wf["10"]["inputs"]["image"], "stage2.png")
        self.assertEqual(wf["20"]["inputs"]["image"], "stage1.png")
        self.assertEqual(wf["3"]["inputs"]["latent_image"], ["12", 0])
        self.assertEqual(wf["3"]["inputs"]["model"], ["23", 0])
        self.assertNotIn("23", build_workflow("starter", 42)["prompt"])

    def test_generated_starter_uses_shared_style_then_its_own_original(self):
        self.seed(species="dragon", element="light", level=31, stage=2)
        provider = FakeProvider()
        result = self.service(provider, curated=True).render("123", engine.execute("123", "status")["image"])
        self.assertEqual(result["status"], "ready")
        self.assertIsNone(provider.calls[0][2])
        self.assertEqual(provider.calls[0][3].name, art.TEMPLATE["starter_style_reference"])
        self.assertEqual(provider.calls[1][3].name, "dragon_light_stage1.png")

    def test_cached_stages_keep_original_anchor_and_branches_share_parent(self):
        self.seed(species="plant", element="nature", level=81, stage=4, evolution_branch="light")
        provider = FakeProvider()
        service = self.service(provider, curated=True)
        service.render("123", engine.execute("123", "status")["image"])
        first_final = provider.calls[-1]
        st = engine.load_state("123")
        st["evolution_branch"] = "dark"
        engine.save_state(st)
        result = service.render("123", engine.execute("123", "status")["image"])
        self.assertEqual(result["status"], "ready")
        self.assertEqual(len(provider.calls), 4)  # stages 2, 3, light, dark
        self.assertEqual(first_final[2], provider.calls[-1][2])
        self.assertEqual(first_final[3], provider.calls[-1][3])
        self.assertIn("stage1", provider.calls[-1][3].name)

    def test_changing_anchor_invalidates_pending_job(self):
        provider = ComfyUIProvider(timeout=0.01, poll_interval=0)
        spec = art.describe(base_state())
        reference = self.root / "previous.png"
        anchor = self.root / "original.png"
        reference.write_bytes(fixture_png())
        anchor.write_bytes(fixture_png())
        def network(route, *args, **kwargs):
            return {"prompt_id": "pending"} if route == "/prompt" else {}
        with patch.object(provider, "upload", return_value="uploaded.png"), patch.object(provider, "_http", side_effect=network) as http:
            for content in (fixture_png(), b"different reference bytes"):
                anchor.write_bytes(content)
                with self.assertRaises(GameError) as caught:
                    provider.generate(spec, "prompt", reference, self.root / "anchor.job.json", style_reference=anchor)
                self.assertEqual(caught.exception.code, "image_timeout")
        self.assertEqual(sum(c.args[0] == "/prompt" for c in http.call_args_list), 2)

    def test_comfy_reads_only_save_node_and_downloads_png(self):
        provider = ComfyUIProvider()
        spec = art.describe(base_state())
        def network(route, *args, **kwargs):
            if route == "/prompt":
                return {"prompt_id": "job1"}
            if route.startswith("/history"):
                return {"job1": {"outputs": {"preview": {"images": [{"filename": "wrong.png"}]},
                                              "9": {"images": [{"filename": "correct image.png"}]}}}}
            self.assertIn("correct+image.png", route)
            return fixture_png()
        with patch.object(provider, "_http", side_effect=network):
            data = provider.generate(spec, "prompt", None, self.root / "job.json")
        self.assertEqual(data, fixture_png())

    def test_comfy_reports_execution_error_and_missing_output(self):
        for status, expected in (({"status_str": "error"}, "image_generation_failed"),
                                 ({"completed": True}, "image_missing_output")):
            provider = ComfyUIProvider()
            with patch.object(provider, "_http", side_effect=[{"prompt_id": "job1"}, {"job1": {"status": status}}]):
                with self.assertRaises(GameError) as caught:
                    provider.generate(art.describe(base_state()), "prompt", None, self.root / (expected + ".json"))
                self.assertEqual(caught.exception.code, expected)

    def test_seed_is_stable_across_processes_and_explicit_seed_preserved(self):
        spec = art.describe(base_state())
        self.assertEqual(art.image_seed(spec), art.image_seed(json.loads(json.dumps(spec))))
        self.assertEqual(art.image_seed(dict(spec, seed=42)), 42)

    def test_png_validation_rejects_corruption_and_truncation(self):
        validate_png(fixture_png())
        for data in (b"", fixture_png()[:-5], fixture_png() + b"garbage", fixture_png().replace(b"IDAT", b"JDAT")):
            with self.assertRaises(GameError):
                validate_png(data)

    def test_cli_accepts_korean_stage_and_rejects_outside_asset_path(self):
        import subprocess
        import sys
        root = Path(__file__).resolve().parents[1]
        cli = [sys.executable, "-X", "utf8", str(root / "tools/gen_image.py"),
               "식물족", "자연", "성장기"]
        result = subprocess.run(cli + ["samples/test.png", "42", "--dry-run"], capture_output=True,
                                text=True, encoding="utf-8")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["seed"], 42)
        self.assertIn(art.TEMPLATE["species_stages"]["plant"]["2"], payload["prompt"])
        result = subprocess.run(cli + ["../outside.png", "--dry-run"], capture_output=True,
                                text=True, encoding="utf-8")
        self.assertEqual(result.returncode, 1)
        self.assertFalse(json.loads(result.stdout)["ok"])


if __name__ == "__main__":
    unittest.main()
