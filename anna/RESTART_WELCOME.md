# Restart to welcome screen — 0.2.7 / tool 0.1.14

Start over confirms removal of the current companion, chat and portraits, then returns to the ordinary first-meeting screen. No name is requested in the reset dialog and no new species or element is selected during cleanup. The user chooses a name and Random or Drawing afterward.

Cleanup retains its interrupted-reset barrier. The completed reset retains a minimal welcome marker, reset receipt and fresh request epoch. The next explicit start uses a conditional write against this existing row; late old actions cannot create or replace the new companion. Retrying a completed reset cannot clear a newly started game. Old clients may still pass a name for compatibility, while the current UI omits it.

This patch is based on the working 0.2.5 release. Direct evolution image editing is not included. The existing review candidate remains 0.2.5 until explicitly replaced; testing this patch must not reset a real player's data automatically.
