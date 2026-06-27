import re
from typing import Dict


async def scan_content(text: str = "", url: str = None) -> Dict:
    threats = []
    lower_text = text.lower()

    danger_patterns = [
        r"password",
        r"bank account",
        r"credit card",
        r"phish",
        r"malware",
        r"free gift",
        r"click here.*win",
        r"urgent.*action",
    ]

    for pattern in danger_patterns:
        if re.search(pattern, lower_text):
            threats.append("Potential phishing or scam detected")
            break

    if url and re.search(r"(bit\.ly|tinyurl\.com|short\.ly|goo\.gl)", url):
        threats.append("Shortened URL detected - high risk")

    return {
        "safe": len(threats) == 0,
        "threats": threats,
        "score": 0 if threats else 95,
        "recommendation": "BLOCK" if threats else "SAFE",
    }
