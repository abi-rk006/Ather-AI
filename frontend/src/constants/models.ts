import type { LLMProvider } from '../types';

export interface ModelOption {
  label: string;
  value: string;
}

export const PROVIDER_MODEL_OPTIONS: Record<LLMProvider, ModelOption[]> = {
  groq: [
    { label: 'Qwen 3.8 27B (Recommended - Active & Fast)', value: 'qwen/qwen3.8-27b' },
    { label: 'OpenAI GPT OSS 120B (Active - Reasoning)', value: 'openai/gpt-oss-120b' },
    { label: 'OpenAI GPT OSS 20B (Active - Lightweight)', value: 'openai/gpt-oss-20b' },
    { label: 'Allam 2 7B (Active on Groq)', value: 'allam-2-7b' },
  ],
  nvidia: [
    { label: 'Llama 3.3 70B Instruct (Recommended - Flagship)', value: 'meta/llama-3.3-70b-instruct' },
    { label: 'Llama 3.1 Nemotron 70B (NVIDIA Tuned)', value: 'nvidia/llama-3.1-nemotron-70b-instruct' },
    { label: 'Mistral Large 4 (1T MoE / 52B Active)', value: 'mistralai/mistral-large-4-1t-a52b' },
    { label: 'Mistral Large 2411 (Enterprise MoE)', value: 'mistralai/mistral-large-2411' },
    { label: 'Llama 3.1 8B Instruct (Fast & Lightweight)', value: 'meta/llama-3.1-8b-instruct' },
    { label: 'DeepSeek R1 (STEM Reasoning)', value: 'deepseek-ai/deepseek-r1' },
    { label: 'Qwen 2.5 72B Instruct (High Precision)', value: 'qwen/qwen2.5-72b-instruct' },
    { label: 'Mixtral 8x22B Instruct (MoE)', value: 'mistralai/mixtral-8x22b-instruct-v0.1' },
    { label: 'Llama 3.1 405B Instruct (Ultra Frontier)', value: 'meta/llama-3.1-405b-instruct' },
  ],
  lmstudio: [
    { label: 'local-model (Active model loaded in LM Studio)', value: 'local-model' },
    { label: 'llama-3.2-3b-instruct', value: 'llama-3.2-3b-instruct' },
    { label: 'mistral-7b-instruct', value: 'mistral-7b-instruct' },
    { label: 'qwen2.5-coder-7b', value: 'qwen2.5-coder-7b' },
  ],
  ollama: [
    { label: 'llama3.2 (Meta Llama 3.2)', value: 'llama3.2' },
    { label: 'mistral (Mistral 7B)', value: 'mistral' },
    { label: 'deepseek-r1:8b', value: 'deepseek-r1:8b' },
    { label: 'qwen2.5:7b', value: 'qwen2.5:7b' },
  ],
  openai: [
    { label: 'GPT-4o (Omni - Flagship Multimodal)', value: 'gpt-4o' },
    { label: 'GPT-4o-mini (Lightweight & Fast)', value: 'gpt-4o-mini' },
    { label: 'o3-mini (High-reasoning STEM)', value: 'o3-mini' },
  ],
  gemini: [
    { label: 'Gemini 2.5 Flash (Recommended - Active & Fast)', value: 'gemini-2.5-flash' },
    { label: 'Gemini 1.5 Flash (Balanced & Fast)', value: 'gemini-1.5-flash' },
    { label: 'Gemini 2.5 Pro (Advanced Reasoning & STEM)', value: 'gemini-2.5-pro' },
    { label: 'Gemini 1.5 Pro (1M+ Context)', value: 'gemini-1.5-pro' },
  ],
  custom: [
    { label: 'Custom Model (Enter custom model name below)', value: 'custom-model' },
  ],
  anthropic: [
    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
    { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku' },
  ],
};

export const POPULAR_CUSTOM_MODEL_SUGGESTIONS: Partial<Record<LLMProvider, string[]>> = {
  nvidia: [
    'meta/llama-3.2-3b-instruct',
    'meta/llama-3.2-1b-instruct',
    'nvidia/nemotron-4-340b-instruct',
    'mistralai/mistral-large-2407',
    'google/gemma-2-27b-it',
    'microsoft/phi-3-medium-128k-instruct',
  ],
  groq: [
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'allam-2-7b',
  ],
  ollama: [
    'llama3.2:1b',
    'deepseek-r1:14b',
    'phi4',
    'qwen2.5-coder:7b',
    'mistral-nemo',
  ],
  lmstudio: [
    'local-model',
    'deepseek-r1-distill-qwen-7b',
    'hermes-3-llama-3.1-8b',
  ],
  openai: [
    'o1',
    'o1-mini',
    'gpt-4-turbo',
  ],
  gemini: [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-1.5-pro',
  ],
  custom: [
    'my-finetuned-model',
    'meta-llama/Llama-3-70b-chat-hf',
    'mistralai/Mixtral-8x7B-Instruct-v0.1',
  ],
};
