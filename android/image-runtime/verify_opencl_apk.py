"""Passive APK/ELF inspection only. Never loads native code or calls a phone."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('apk', type=Path)
parser.add_argument('--readelf', type=Path, required=True)
parser.add_argument('--report', type=Path, required=True)
parser.add_argument('--reference-apk', type=Path, required=True)
args = parser.parse_args()
with zipfile.ZipFile(args.apk) as z:
    assert len(z.namelist()) == len(set(z.namelist())), 'Duplicate ZIP entries'
    libraries = [n for n in z.namelist() if n.startswith('lib/')]
    assert all(n.startswith('lib/arm64-v8a/') for n in libraries), 'Unexpected ABI'
    assert not any(n.endswith('/libOpenCL.so') for n in libraries), 'Link-only loader must not replace the phone vendor driver'
    mapping = json.loads(z.read('assets/game/anna-source-map.json'))
    lock = json.loads((Path(__file__).resolve().parents[1] / 'anna-reference.json').read_text(encoding='utf8'))
    assert len(mapping) == 467
    for name, source in mapping.items():
        assert hashlib.sha256(z.read('assets/game/' + name)).hexdigest() == lock['files'][source['source']]
    with zipfile.ZipFile(args.reference_apk) as before:
        game_files = [n for n in before.namelist() if n.startswith('assets/game/')]
        assert set(game_files) == {n for n in z.namelist() if n.startswith('assets/game/')}, 'Shared game asset set changed'
        assert all(z.read(n) == before.read(n) for n in game_files), 'Anna/UI/adapter game asset changed'
    binary = z.read('lib/arm64-v8a/libnotebuddy_image.so')
    assert binary[:4] == b'\x7fELF' and int.from_bytes(binary[18:20], 'little') == 183, 'AArch64 ELF required'
    for marker in (b'GPUOpenCL', b'OPENCL_PLATFORM_UNAVAILABLE', b'CPU fallback disabled', b'1024px generation remains blocked'):
        assert marker in binary, marker
with tempfile.TemporaryDirectory(prefix='notebuddy-elf-') as temp:
    elf = Path(temp) / 'libnotebuddy_image.so'
    elf.write_bytes(binary)
    dynamic = subprocess.check_output([str(args.readelf), '-d', str(elf)], text=True)
    symbols = subprocess.check_output([str(args.readelf), '--dyn-syms', '--wide', str(elf)], text=True)
assert 'Shared library: [libOpenCL.so]' in dynamic
assert 'OPENCL_1.' not in symbols and 'OPENCL_2.' not in symbols, 'Do not require Linux-specific OpenCL symbol versions'
for method in ('nativeDevices', 'nativeBackend', 'nativeRun', 'selectedDevice'):
    assert 'Java_io_github_kdkrkwhr_notebuddy_imageprobe_NativeImage_' + method in symbols
report = {'apk': str(args.apk.resolve()), 'bytes': args.apk.stat().st_size,
          'sha256': hashlib.file_digest(args.apk.open('rb'), 'sha256').hexdigest(),
          'nativeSha256': hashlib.sha256(binary).hexdigest(), 'abi': 'arm64-v8a',
          'backend': 'opencl', 'vendorLibraryBundled': False, 'dynamicSection': dynamic,
          'pinnedAnnaFiles': len(mapping), 'unchangedGameAssets': len(game_files), 'libraries': libraries,
          'phoneExecution': False, 'generationExecuted': False, 'qualityOrSpeedClaim': False,
          'product1024': 'blocked', 'limitations': ['ELF linkage does not prove phone driver access, kernel compatibility or GPU execution']}
args.report.parent.mkdir(parents=True, exist_ok=True)
args.report.write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
print(json.dumps({k: report[k] for k in ('bytes','sha256','abi','backend','vendorLibraryBundled','phoneExecution')}))
