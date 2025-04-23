import os
import httpx
from mcp.server.fastmcp import FastMCP

BASE_URL = os.getenv("BASE_URL", "https://v6.exchangerate-api.com/v6")
API_KEY = os.getenv("API_KEY")

mcp = FastMCP("Exchange Rate Server")

@mcp.tool()
async def get_latest_rates(base_currency: str) -> dict:
    """
    Get the latest exchange rates for a given base currency.

    Args:
        base_currency (str): The base currency (e.g. USD, EUR, GBP, etc.) to get the latest rates for.

    Returns:
        dict: A dictionary containing the latest exchange rates.
    """

    url = f"{BASE_URL}/{API_KEY}/latest/{base_currency}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()

        return response.json()

if __name__ == "__main__":
    mcp.run(transport="stdio")
