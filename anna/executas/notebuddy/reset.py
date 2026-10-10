"""Confirmed new-partner reset, with an interrupted-cleanup barrier."""
import re
import uuid
from executa_sdk import StorageError
from executa_sdk.storage import STORAGE_ERR_PRECONDITION_FAILED
from receipts import unpack, pack, metadata, META, MAX_SEQUENCE
from privacy import erased

MARKER = '_notebuddy_reset'
ID_KEY = '_anna_reset_id'

def pending(document):
    return isinstance(document, dict) and document.get(MARKER) == 1

async def reset(storage, key, args, evaluate):
    if not isinstance(args, dict) or set(args)-{'action','confirmation','expected_etag','reset_id','name'}:
        raise ValueError('Invalid reset arguments.')
    action=args.get('action')
    if action not in ('inspect','begin','finish'):
        raise ValueError('Unsupported reset action.')
    allowed={'inspect':{'action'},'begin':{'action','confirmation','expected_etag','reset_id','name'},'finish':{'action','reset_id'}}[action]
    if set(args)!=allowed:
        raise ValueError('Reset arguments do not match the action.')
    if action!='inspect' and not re.fullmatch(r'[A-Za-z0-9_-]{16,64}',str(args.get('reset_id',''))):
        raise ValueError('Invalid reset ID.')
    if action=='begin':
        if args['confirmation']!='RESET NOTEBUDDY' or not isinstance(args['expected_etag'],str) or not args['expected_etag']:
            raise ValueError('Explicit reset confirmation and preview are required.')
        if not isinstance(args['name'],str) or not 1<=len(args['name'].strip())<=24 or any(ord(c)<32 for c in args['name']):
            raise ValueError('A new companion name is required (1–24 characters).')
    row=await storage.get(key,scope='tool');document=row.get('value')
    restarting = erased(document)
    if action=='inspect':
        return {'ok':True,'exists':bool(row.get('exists')),'etag':row.get('etag'),
                'erased':restarting,'restart_allowed':restarting,'reset_from_erasure':bool(document and document.get('from_erasure')) if pending(document) else False,
                'reset_pending':pending(document),'reset_id':document.get('reset_id') if pending(document) else (unpack(document) or {}).get(ID_KEY)}
    if not row.get('exists') or not row.get('etag'):return {'ok':False,'code':'reset_unavailable'}
    if pending(document):
        if args['reset_id']!=document['reset_id']:return {'ok':False,'code':'reset_changed'}
        if action=='begin':return {'ok':True,'reset_pending':True,'reset_id':document['reset_id']}
        candidate=pack(document['game'])
    else:
        previous={} if restarting else unpack(document)
        if previous.get(ID_KEY)==args['reset_id']:
            return {'ok':True,'reset_complete':True,'reset_id':args['reset_id']}
        if action=='finish' or args['expected_etag']!=row['etag']:
            return {'ok':False,'code':'reset_changed'}
        # Validate active saves before replacing them. Removal markers have no
        # old state or sequence to recover; they receive a new namespace below.
        if not restarting:
            old=await evaluate({'command':'status','state':previous})
            if not old['result'].get('ok'):return {'ok':False,'code':'reset_unavailable'}
        sequence=0 if restarting else metadata(previous)['next_sequence']
        if sequence>=MAX_SEQUENCE:return {'ok':False,'code':'reset_unavailable'}
        new=await evaluate({'command':'start','name':args['name'].strip(),'state':None})
        if not new['result'].get('ok'):return {'ok':False,'code':'reset_unavailable'}
        game=new['state'];game['processed_requests']={}
        game[META]={'version':1,'next_sequence':sequence+1,'order':[]};game[ID_KEY]=args['reset_id']
        # Removal discarded the old high-water mark. A fresh epoch and format-3
        # envelope reject every pre-removal action, including old adapters.
        epoch=uuid.uuid4().hex if restarting else metadata(previous).get('epoch')
        if epoch:game[META]['epoch']=epoch
        candidate={MARKER:1,'reset_id':args['reset_id'],'game':game,'from_erasure':restarting}
    try:await storage.set(key,candidate,scope='tool',if_match=row['etag'])
    except StorageError as error:
        if error.code==STORAGE_ERR_PRECONDITION_FAILED:return {'ok':False,'code':'reset_changed'}
        raise
    return {'ok':True,'reset_pending':action=='begin','reset_complete':action=='finish','reset_id':args['reset_id']}
