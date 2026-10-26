"""Offline cross-build only; existing pinned archives/tools, no downloads/inference."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

HERE = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--workspace', type=Path, required=True)
    args = parser.parse_args()
    root = args.workspace.resolve()
    tools = root / 'build-tools'
    deps = tools / 'opencl-pinned'
    for item in json.loads((HERE / 'opencl-dependencies.json').read_text(encoding='utf8')):
        archive = deps / f"{item['name']}-{item['commit']}.zip"
        assert hashlib.sha256(archive.read_bytes()).hexdigest() == item['sha256'], archive
        # Verify extracted upstream source as well as the archive before building.
        with zipfile.ZipFile(archive) as z:
            for entry in z.infolist():
                if not entry.is_dir():
                    path = (deps / entry.filename).resolve()
                    assert path.is_relative_to(deps.resolve())
                    assert hashlib.sha256(path.read_bytes()).digest() == hashlib.sha256(z.read(entry)).digest(), path
    runtime = root / 'native-runtime'
    assert subprocess.check_output(['git', '-C', str(runtime), 'rev-parse', 'HEAD'], text=True).strip() == 'e41fbcf455e0fbb45e08bd535b00d6cba865e921'
    assert not subprocess.check_output(['git', '-C', str(runtime), 'status', '--porcelain'], text=True).strip()
    cmake = tools / 'cmake/3.22.1/bin/cmake.exe'
    ndk = tools / 'ndk/30.0.16248370'
    headers = deps / 'OpenCL-Headers-8a97ebc88daa3495d6f57ec10bb515224400186f'
    loader = deps / 'OpenCL-ICD-Loader-ad770a1b64c6b8d5f2ed4e153f22e4f45939f27f'
    link_build = deps / 'link-arm64'
    common = ['-G', 'Ninja', f'-DCMAKE_MAKE_PROGRAM={cmake.parent / "ninja.exe"}',
              f'-DCMAKE_TOOLCHAIN_FILE={ndk / "build/cmake/android.toolchain.cmake"}',
              '-DANDROID_ABI=arm64-v8a', '-DANDROID_PLATFORM=android-31', '-DANDROID_STL=c++_static',
              '-DCMAKE_BUILD_TYPE=Release', '-DCMAKE_POSITION_INDEPENDENT_CODE=ON']
    def run(*command):
        subprocess.run([str(c) for c in command], check=True)
    run(cmake, '-S', HERE / 'opencl-link', '-B', link_build, *common,
        f'-DOPENCL_LOADER_SOURCE={loader}', f'-DOPENCL_ICD_LOADER_HEADERS_DIR={headers}')
    run(cmake, '--build', link_build, '--parallel', '2')
    run(cmake, '-S', runtime, '-B', root / 'native-build-opencl', *common,
        '-DSD_OPENCL=ON', '-DSD_VULKAN=OFF', '-DGGML_OPENMP=OFF', '-DGGML_NATIVE=OFF',
        '-DSD_BUILD_EXAMPLES=OFF', '-DSD_WEBP=OFF', '-DSD_WEBM=OFF', '-DGGML_OPENCL_EMBED_KERNELS=ON',
        '-DGGML_OPENCL_USE_ADRENO_KERNELS=ON', f'-DOpenCL_INCLUDE_DIR={headers}',
        f'-DOpenCL_LIBRARY={link_build / "loader/libOpenCL.so"}')
    run(cmake, '--build', root / 'native-build-opencl', '--target', 'stable-diffusion', '--parallel', '2')


if __name__ == '__main__':
    main()
