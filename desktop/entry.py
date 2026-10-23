import multiprocessing
from desktop.app import main

if __name__ == '__main__':
    multiprocessing.freeze_support()
    raise SystemExit(main())
