"""Discord transport: reply immediately, then attach art to that same message."""
import asyncio
from pathlib import Path
import shlex
import engine
from adapter import bind_discord_event
from runtime import MISSING, atomic_write_json, read_json, validate_user_id


def parse_command(content):
    if not content.startswith("!"):
        return None
    try:
        parts = shlex.split(content[1:])
    except ValueError:
        return None
    if not parts:
        return None
    command = engine.ALIASES.get(parts[0], parts[0])
    if command not in engine.PLAYER_COMMANDS:
        return None
    return command, parts[1:]


def response_text(result):
    if not result["ok"]:
        return (result.get("msg") or "지금은 할 수 없어.")[:1800]
    if "name" in result and "stats" in result:
        stats = result["stats"]
        text = (f"나는 {result['name']}! Lv.{result['level']} · {result['species']} · {result['element']}\n"
                f"경험치 {result['xp']}/{result['xp_next']} · 친밀도 {result['intimacy']} · 포만감 {result['satiety']}\n"
                f"HP {stats['hp']} · 공격 {stats['atk']} · 방어 {stats['def']}")
        if result.get("encounter"):
            text += "\n만난 몬스터가 기다리고 있어. !배틀 / !포획 / !도망"
    elif "commands" in result:
        text = "함께 놀자! " + " · ".join("!" + c for c in result["commands"])
    elif "ranking" in result:
        text = "랭킹\n" + "\n".join(f"{i}. {r['name']} · Lv.{r['lv']}" for i, r in enumerate(result["ranking"], 1))
    elif "catches" in result:
        text = f"우리 도감에 {len(result['catches'])}마리가 있어!"
    elif "titles" in result:
        text = "내 칭호: " + (", ".join(result["titles"]) or "새내기")
    else:
        text = result.get("msg") or "완료했어!"
    xp = result.get("xp_result", {})
    if xp.get("gained"):
        text += f"\n경험치 +{xp['gained']}"
    if xp.get("evolutions"):
        text += f"\n{xp['leveled_to']}레벨로 성장했어!"
    if result.get("loot", {}).get("normal_feed"):
        text += f"\n사료 +{result['loot']['normal_feed']}"
    return text[:1800]


class DiscordDelivery:
    """Use one gateway process per data root. discord_module is injectable for tests."""
    def __init__(self, image_service, discord_module, *, root=None):
        self.images = image_service
        self.discord = discord_module
        self.root = Path(root) if root else Path(engine.STATE_DIR).parent / "delivery"
        self.inflight = {}

    async def handle(self, message):
        if message.author.bot:
            return
        parsed = parse_command(message.content)
        if parsed is None:
            return
        uid, event_id = validate_user_id(str(message.author.id)), validate_user_id(str(message.id))
        key = (uid, event_id)
        if key in self.inflight:
            return await asyncio.shield(self.inflight[key])
        task = asyncio.create_task(self._deliver(message, uid, event_id, *parsed))
        self.inflight[key] = task
        task.add_done_callback(lambda done: self.inflight.pop(key, None))
        try:
            return await asyncio.shield(task)
        finally:
            if task.done():
                self.inflight.pop(key, None)

    async def _deliver(self, message, uid, event_id, command, arguments):
        tool = bind_discord_event(uid, event_id)
        result = await asyncio.to_thread(tool, command, arguments)
        text = response_text(result)
        mentions = self.discord.AllowedMentions.none()
        receipt_path = self.root / uid / (event_id + ".json")
        receipt = await asyncio.to_thread(read_json, receipt_path)
        if receipt is MISSING:
            receipt = {}
        if not isinstance(receipt, dict):
            raise ValueError("Invalid delivery receipt")
        reply = None
        if receipt.get("channel_id") == str(message.channel.id) and receipt.get("reply_id"):
            if receipt.get("complete") and result["ok"]:
                return result
            try:
                reply = await message.channel.fetch_message(int(receipt["reply_id"]))
            except self.discord.NotFound:
                pass
        if reply is None:
            reply = await message.reply(text, mention_author=False, allowed_mentions=mentions)
            receipt = {"channel_id": str(message.channel.id), "reply_id": str(reply.id), "complete": False}
            await asyncio.to_thread(atomic_write_json, receipt_path, receipt)
        elif not result["ok"]:
            await reply.edit(content=text, attachments=[], allowed_mentions=mentions)
        spec = result.get("image") or result.get("xp_result", {}).get("image")
        if result["ok"] and spec:
            image = await asyncio.to_thread(self.images.render, uid, spec)
            if image.get("path") and await asyncio.to_thread(self.images.current, uid, spec):
                suffix = "\n그림은 아직 이전 모습이야. 성장은 정상적으로 적용됐어." if image["status"] == "fallback" else ""
                with self.discord.File(image["path"]) as attachment:
                    await reply.edit(content=text + suffix, attachments=[attachment], allowed_mentions=mentions)
            elif image["status"] != "stale":
                await reply.edit(content=text + "\n그림은 준비 중이야. 잠시 후 !상태로 확인해 줘.", allowed_mentions=mentions)
        receipt["complete"] = True
        await asyncio.to_thread(atomic_write_json, receipt_path, receipt)
        return result
