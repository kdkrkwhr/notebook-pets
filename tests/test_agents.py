"""Provider-neutral adapter and real stdio MCP protocol regression tests."""
import asyncio
import importlib.util
import json
import os
import sys
import unittest
import test_p0
from test_p0 import ROOT
from adapter import bind_game_event, bind_discord_event, dispatch_tool, tool_definition


class AgentTests(unittest.TestCase):
    setUp = test_p0.RuntimeTests.setUp
    seed = test_p0.RuntimeTests.seed

    def test_model_switch_preserves_receipt(self):
        self.seed(satiety=20)
        first = bind_game_event('123', 'chat:message_1')('feed')
        self.assertTrue(first['ok'], first)
        self.assertEqual(first, bind_game_event('123', 'chat:message_1')('feed'))
        self.assertTrue(bind_game_event('123', 'chat:message_1')('status')['ok'])
        conflict = bind_game_event('123', 'chat:message_1')('play')
        self.assertEqual(conflict['code'], 'request_conflict')

    def test_discord_receipt_compatible(self):
        self.seed(satiety=20)
        self.assertEqual(bind_discord_event('123', '456')('feed'),
                         bind_game_event('123', 'discord:456')('feed'))

    def test_read_only_and_identity_boundary(self):
        self.seed()
        tool = bind_game_event('123')
        self.assertTrue(tool('status')['ok'])
        for command in ('feed', 'owner', 'reset', '밥줘'):
            self.assertEqual(tool(command)['code'], 'forbidden')
        self.assertEqual(dispatch_tool(tool, {'command': 'status', 'actor_id': '999'})['code'],
                         'invalid_arguments')
        self.assertNotIn('feed', tool_definition(writable=False)['parameters']['properties']['command']['enum'])
        with self.assertRaises(ValueError):
            bind_game_event('123', '')

    def test_bound_tool_rejects_admin_and_invalid_payload(self):
        tool = bind_game_event('123', 'chat:1')
        for command in ('owner', 'clearowner', 'reset'):
            self.assertEqual(tool(command)['code'], 'forbidden')
        for payload in ([], {}, {'command': 'status', 'event_id': 'new'}):
            self.assertEqual(dispatch_tool(tool, payload)['code'], 'invalid_arguments')
        self.assertEqual(tool('feed', 'not-an-array')['code'], 'invalid_arguments')

    @unittest.skipUnless(importlib.util.find_spec('mcp'), 'install requirements-mcp.txt')
    def test_real_stdio_protocol(self):
        self.seed(satiety=20)

        async def run(event):
            from mcp import ClientSession, StdioServerParameters
            from mcp.client.stdio import stdio_client
            env = dict(os.environ, NOTEBOOK_ACTOR_ID='123', PYTHONUTF8='1')
            env.pop('NOTEBOOK_EVENT_ID', None)
            if event:
                env['NOTEBOOK_EVENT_ID'] = event
            params = StdioServerParameters(command=sys.executable,
                args=['-B', '-X', 'utf8', str(ROOT / 'tools' / 'mcp_server.py')], env=env)
            async with stdio_client(params) as (read, write):
                async with ClientSession(read, write) as client:
                    await client.initialize()
                    listing = await client.list_tools()
                    self.assertEqual([t.name for t in listing.tools], ['notebook_game'])
                    self.assertNotIn('actor_id', listing.tools[0].inputSchema['properties'])
                    result = await client.call_tool('notebook_game', {'command': 'status'})
                    self.assertTrue(json.loads(result.content[0].text)['ok'])
                    quests = await client.call_tool('notebook_game', {'command': 'quests'})
                    self.assertEqual(len(json.loads(quests.content[0].text)['quest']['tasks']), 3)
                    if not event:
                        claim = await client.call_tool('notebook_game', {'command': 'claimquest'})
                        self.assertTrue(claim.isError)
                    denied = await client.call_tool('notebook_game', {'command': 'reset'})
                    self.assertTrue(denied.isError)
                    spoof = await client.call_tool('notebook_game', {'command': 'status', 'actor_id': '999'})
                    self.assertTrue(spoof.isError)
                    feed = await client.call_tool('notebook_game', {'command': 'feed'})
                    if not event:
                        self.assertTrue(feed.isError)
                        return None
                    value = json.loads(feed.content[0].text)
                    self.assertTrue(value['ok'], value)
                    return value

        async def scenario():
            await run(None)
            first = await run('mcp:message_1')
            self.assertEqual(first, await run('mcp:message_1'))
        asyncio.run(asyncio.wait_for(scenario(), timeout=45))
