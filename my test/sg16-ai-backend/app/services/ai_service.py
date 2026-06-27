from groq import Groq
from app.core.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)


async def get_ai_response(prompt: str, system_prompt: str = None) -> str:
    try:
        response = client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                    or "You are SG16, the most powerful and helpful AI engine by SaifTech Global.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=2048,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"SG16 Error: {str(e)}"
