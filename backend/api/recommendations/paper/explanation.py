import anthropic
import json

async def generate_claude_explanation(
    user_context: str, paper_abstract: str, claude_api_key: str
) -> dict:
    client = anthropic.AsyncAnthropic(api_key=claude_api_key)

    prompt = f"""
    The user is currently researching: "{user_context}".
    Explain in EXACTLY 3 bullet points why they should read the following paper.
    The response MUST be valid JSON with a single key "bullets" mapping to a list of strings.
    Paper Abstract: {paper_abstract}
    """

    response = await client.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=250,
        system="You are a medical AI assistant. Return ONLY valid JSON.",
        messages=[{"role": "user", "content": prompt}]
    )

    try:
        return json.loads(response.content[0].text)
    except json.JSONDecodeError:
        return {"bullets": ["Explanation unavailable."]}
