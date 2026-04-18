import asyncio
import sys
import json
import os
import logging

# Redirect all crawl4ai/logging output to stderr, keep only JSON on stdout
logging.basicConfig(level=logging.WARNING, stream=sys.stderr)
for logger_name in ['crawl4ai', 'crawl4ai.extractor', 'crawl4ai.browser']:
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.WARNING)
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    handler = logging.StreamHandler(sys.stderr)
    handler.setLevel(logging.WARNING)
    logger.addHandler(handler)

from crawl4ai import AsyncWebCrawler

async def crawl(url: str) -> dict:
    try:
        async with AsyncWebCrawler(verbose=False) as crawler:
            result = await crawler.arun(url=url)
            return {
                "success": True,
                "markdown": str(result.markdown)
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.stderr.write("No URL provided\n")
        sys.exit(1)

    url = sys.argv[1]
    result = asyncio.run(crawl(url))
    sys.stdout.write(json.dumps(result))
    sys.stdout.flush()
