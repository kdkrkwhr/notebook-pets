# Restart to welcome screen — 0.2.7 / tool 0.1.14

Start over confirms removal of the current companion, chat and portraits, then returns to the ordinary first-meeting screen. No name is requested in the reset dialog and no new species or element is selected during cleanup. The user chooses a name and Random or Drawing afterward.

Cleanup retains its interrupted-reset barrier. The completed reset retains a minimal welcome marker, reset receipt and fresh request epoch. The next explicit start uses a conditional write against this existing row; late old actions cannot create or replace the new companion. Retrying a completed reset cannot clear a newly started game. Old clients may still pass a name for compatibility, while the current UI omits it.

This patch is based on the working 0.2.5 release. Direct evolution image editing is not included. The existing review candidate remains 0.2.5 until explicitly replaced; testing this patch must not reset a real player's data automatically.

Verification: 52 server tests, 41 browser tests and all UI unit tests passed. Linux and Windows CI packages passed in run 38061043894 (source 3b67289). Working revision 27 is ready. Immutable candidate 0.2.7 is version 1253, tool 0.1.14 is Executa version 706. After apps cut uploaded the binary packages, working install confirmed agent_version 0.1.14 loaded. A deliberately invalid confirmation was rejected by the new name-optional handler without data mutation. Review remains pending_review on 0.2.5; no review replacement or public release was performed.

