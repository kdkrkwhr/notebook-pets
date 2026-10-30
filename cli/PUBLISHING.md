# Notebook Pets CLI: PyPI release

Distribution: `notebook-pets`, initial version `0.1.0a1`, import `notebook_pets`, command `notebook-pets`.
The package's version is independent of Anna, desktop and Android. A CLI release does not deploy those apps.

## First-time account setup

Create/sign into a PyPI account, verify its email and configure two-factor authentication. Then use PyPI's [publishing page](https://pypi.org/manage/account/publishing/) to add a **pending trusted publisher**:

| Field | Value |
| --- | --- |
| PyPI project name | `notebook-pets` |
| Owner | `kdkrkwhr` |
| Repository | `notebook-pets` |
| Workflow filename | `pypi.yml` |
| Environment | `pypi` |

This uses GitHub's short-lived identity; do not paste passwords, recovery codes or API tokens into chat. The package name was not publicly listed when checked on 2026-10-26; only a successful upload establishes ownership. A 404 does not prove that a name is unreserved or that upload will be allowed.

## Build, review and publish

1. Run `python -m build` and `python -m twine check dist/*`.
2. Install the wheel in a new virtual environment, then `python -m unittest discover -s cli/tests -p 'test_*.py' -v`. The tests use isolated temporary saves and actual stdio MCP, without AI.
3. Push the tested changes to `release`. `pypi.yml` builds the sdist and a wheel from that sdist, validates metadata and runs installed-package tests on Windows, macOS and Linux. No upload happens on push.
4. After the PyPI pending publisher is configured, run **Python package → Run workflow** on `release`, checking `publish`. The same run builds and tests first. Only this explicit manual run can upload the tested artifact. Version numbers cannot be reused for different files.
5. Read back `https://pypi.org/pypi/notebook-pets/json`, compare its version and file hashes, then install from PyPI in a new environment and rerun the smoke tests. Update the README publication status only after this succeeds.
6. Link `https://pepy.tech/projects/notebook-pets` after real download data appears. Indexing may lag; never interpret download counts as unique users.

The workflow is intentionally not triggered to publish by a GitHub release: existing desktop/Anna releases must not upload a Python package unexpectedly. Source archives/wheels use an explicit file allowlist, excluding user saves, private configuration, generated media and native binaries.

Official references: [packaging guide](https://packaging.python.org/en/latest/tutorials/packaging-projects/), [new-project trusted publishing](https://docs.pypi.org/trusted-publishers/creating-a-project-through-oidc/), [pepy data notes](https://pepy.tech/).
