import os
import sys
import pytest

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.chat_service import chat_service


def test_build_messages_for_mistral_strict_alternation():
    """
    Tests that when a Mistral/Mixtral/Gemma model or LM Studio provider is used:
    1. Roles strictly alternate: user/assistant/user/assistant...
    2. Even indices are ALWAYS 'user' (0, 2, 4...)
    3. Odd indices are ALWAYS 'assistant' (1, 3, 5...)
    4. System instructions are embedded into the first user turn instead of a standalone 'system' turn.
    5. No duplicate current user prompt from frontend history.
    """
    system_prompt = "You are an expert Anna University study assistant."
    history = [
        {"role": "user", "content": "What is RNN?"},
        {"role": "assistant", "content": "RNN is a neural network for sequential data."},
        {"role": "user", "content": "Explain LSTM"},  # Frontend duplicate of prompt
    ]
    user_prompt = "Explain LSTM with textbook evidence."
    raw_prompt = "Explain LSTM"

    messages = chat_service._build_messages(
        system_prompt=system_prompt,
        history=history,
        user_prompt=user_prompt,
        raw_prompt=raw_prompt,
        provider="lmstudio",
        model="mistralai/mistral-7b-instruct-v0.3",
    )

    assert len(messages) >= 1
    # Check that the first message is 'user' and embeds the system instruction
    assert messages[0]["role"] == "user"
    assert "SYSTEM INSTRUCTION" in messages[0]["content"]

    # Verify strict alternation: loop.index0 % 2 == 0 must be 'user'
    for idx, m in enumerate(messages):
        expected_role = "user" if idx % 2 == 0 else "assistant"
        assert m["role"] == expected_role, f"Message at index {idx} has role {m['role']}, expected {expected_role}"

    # Verify no duplicate user turns at the end
    assert messages[-1]["role"] == "user"
    assert "Explain LSTM with textbook evidence." in messages[-1]["content"]


def test_build_messages_for_standard_models():
    """
    Tests that standard models (OpenAI, Groq, Llama-3) preserve the standalone 'system' message
    while still enforcing proper deduplication of user turns.
    """
    system_prompt = "You are an expert Anna University study assistant."
    history = [
        {"role": "user", "content": "What is 2PL?"},
        {"role": "assistant", "content": "Two-Phase Locking ensures serializability."},
    ]
    user_prompt = "What are its disadvantages?"

    messages = chat_service._build_messages(
        system_prompt=system_prompt,
        history=history,
        user_prompt=user_prompt,
        raw_prompt=user_prompt,
        provider="groq",
        model="llama-3.3-70b-versatile",
    )

    assert messages[0]["role"] == "system"
    assert messages[0]["content"] == system_prompt
    assert messages[1]["role"] == "user"
    assert messages[2]["role"] == "assistant"
    assert messages[3]["role"] == "user"


if __name__ == "__main__":
    test_build_messages_for_mistral_strict_alternation()
    test_build_messages_for_standard_models()
    print("All message formatting tests passed successfully!")
