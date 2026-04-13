import json
import os
import sys
import urllib.error
import urllib.request


API_BASE = os.getenv("SOURCECHECK_API_BASE", "http://127.0.0.1:8000")

CLAIM_TEST_CASES = [
    {
        "name": "confirmed",
        "expected_verdict": "confirmed",
        "payload": {
            "claim": "GPT-4 achieves 67.0% on the HumanEval coding benchmark in the 0-shot setting",
            "source_url": "https://arxiv.org/abs/2303.08774",
        },
    },
    {
        "name": "incorrect",
        "expected_verdict": "incorrect",
        "payload": {
            "claim": "The GPT-4 Technical Report introduced the Transformer architecture in 2017",
            "source_url": "https://arxiv.org/abs/2303.08774",
        },
    },
    {
        "name": "partially_correct",
        "expected_verdict": "partially_correct",
        "payload": {
            "claim": "GPT-4 is a Transformer-based model and achieves 87% on HumanEval",
            "source_url": "https://arxiv.org/abs/2303.08774",
        },
    },
    {
        "name": "hallucinated_citation",
        "expected_verdict": "hallucinated_citation",
        "payload": {
            "claim": "There are 7 colors in a rainbow",
            "source_url": "https://arxiv.org/abs/2303.08774",
        },
    },
    {
        "name": "unverifiable",
        "expected_verdict": "unverifiable",
        "payload": {
            "claim": "GPT-4 was trained on 12 trillion tokens",
            "source_url": "https://arxiv.org/abs/2303.08774",
        },
    },
]

PARAGRAPH_TEST_CASES = [
    {
        "name": "paragraph_confirmed",
        "expected_verdicts": ["confirmed"],
        "payload": {
            "text": (
                "The GPT-4 Technical Report evaluates the model on a range of benchmarks, "
                "including coding tasks. In the evaluation section, the paper reports that "
                "GPT-4 achieves 67.0% on the HumanEval coding benchmark in the 0-shot setting."
            ),
            "source_url": "https://arxiv.org/abs/2303.08774",
            "citation_hint": "GPT-4 Technical Report (2023)",
        },
    },
    {
        "name": "paragraph_split_mixed_claims",
        "expected_verdicts": ["confirmed", "incorrect"],
        "payload": {
            "text": (
                "According to the GPT-4 Technical Report, GPT-4 is a Transformer-based model "
                "and achieves 87% on HumanEval in the 0-shot setting."
            ),
            "source_url": "https://arxiv.org/abs/2303.08774",
            "citation_hint": "GPT-4 Technical Report (2023)",
        },
    },
]


def post_json(path: str, payload: dict) -> dict:
    request = urllib.request.Request(
        f"{API_BASE}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    print(f"Running SourceCheck smoke tests against {API_BASE}")
    failures = 0

    for case in CLAIM_TEST_CASES:
        print(f"\n[{case['name']}] expected={case['expected_verdict']}")
        try:
            result = post_json("/check", case["payload"])
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            print(f"  HTTP {exc.code}: {body}")
            failures += 1
            continue
        except Exception as exc:
            print(f"  request failed: {exc}")
            failures += 1
            continue

        verdict = result.get("verdict")
        confidence = result.get("confidence")
        explanation = result.get("explanation")
        status = "PASS" if verdict == case["expected_verdict"] else "FAIL"
        if status == "FAIL":
            failures += 1

        print(f"  {status} verdict={verdict} confidence={confidence}")
        print(f"  explanation={explanation}")

    for case in PARAGRAPH_TEST_CASES:
        print(f"\n[{case['name']}] expected={case['expected_verdicts']}")
        try:
            result = post_json("/check-paragraph", case["payload"])
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            print(f"  HTTP {exc.code}: {body}")
            failures += 1
            continue
        except Exception as exc:
            print(f"  request failed: {exc}")
            failures += 1
            continue

        verdicts = [claim.get("verdict") for claim in result.get("claims", [])]
        corrected_text = result.get("corrected_text", "")
        status = "PASS" if verdicts == case["expected_verdicts"] and corrected_text else "FAIL"
        if status == "FAIL":
            failures += 1

        print(f"  {status} verdicts={verdicts}")
        print(f"  corrected_text={corrected_text}")

    print(f"\nCompleted with {failures} failure(s).")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
