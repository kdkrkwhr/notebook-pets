"""Optional stdio MCP transport. No credentials or network listener required."""
import asyncio
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'engine'))
from adapter import bind_game_event, dispatch_tool, tool_definition


async def serve():
    from mcp.server.lowlevel import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import TextContent, Tool, ToolAnnotations

    actor = os.environ.get('NOTEBOOK_ACTOR_ID')
    if not actor:
        raise ValueError('NOTEBOOK_ACTOR_ID must be set by the trusted host')
    event = os.environ.get('NOTEBOOK_EVENT_ID')
    bound = bind_game_event(actor, event)
    definition = tool_definition(writable=event is not None)
    server = Server('notebook-pets')

    @server.list_tools()
    async def list_tools():
        return [Tool(name=definition['name'], description=definition['description'],
                     inputSchema=definition['parameters'],
                     annotations=ToolAnnotations(readOnlyHint=event is None,
                                                 openWorldHint=False))]

    @server.call_tool()
    async def call_tool(name, arguments):
        if name != definition['name']:
            raise ValueError('Unknown tool')
        result = await asyncio.to_thread(dispatch_tool, bound, arguments)
        return [TextContent(type='text', text=json.dumps(result, ensure_ascii=False))]

    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())


if __name__ == '__main__':
    try:
        asyncio.run(serve())
    except (ImportError, ValueError) as error:
        print(f'MCP startup failed: {error}. Install requirements-mcp.txt.', file=sys.stderr)
        sys.exit(1)
