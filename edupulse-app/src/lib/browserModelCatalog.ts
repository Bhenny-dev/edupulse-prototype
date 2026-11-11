/** Checked against WebLLM 0.2.85 and publisher manifests on 11 November 2026.
 * Weight sizes exclude tokenizer/runtime files; GPU figures are upstream estimates. */
export const browserPresets = [
  {
    "id": "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    "name": "Qwen 2.5 · 1.5B — balanced",
    "download": "about 870 MB",
    "memory": "about 1.6 GB GPU memory",
    "weightBytes": 868547584,
    "vramMB": 1629.75,
    "halfPrecision": true,
    "source": "https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    "modelCard": "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct",
    "license": "Apache-2.0"
  },
  {
    "id": "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
    "name": "Qwen 2.5 · 0.5B — lighter / FP32",
    "download": "about 280 MB",
    "memory": "about 1.1 GB GPU memory",
    "weightBytes": 277996288,
    "vramMB": 1060.2,
    "halfPrecision": false,
    "source": "https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
    "modelCard": "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct",
    "license": "Apache-2.0"
  },
  {
    "id": "SmolLM2-135M-Instruct-q0f16-MLC",
    "name": "SmolLM 2 · 135M — tiny",
    "download": "about 270 MB",
    "memory": "about 0.4 GB GPU memory",
    "weightBytes": 269030016,
    "vramMB": 359.69,
    "halfPrecision": true,
    "source": "https://huggingface.co/mlc-ai/SmolLM2-135M-Instruct-q0f16-MLC",
    "modelCard": "https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct",
    "license": "Apache-2.0"
  },
  {
    "id": "SmolLM2-360M-Instruct-q4f16_1-MLC",
    "name": "SmolLM 2 · 360M — small",
    "download": "about 210 MB",
    "memory": "about 0.4 GB GPU memory",
    "weightBytes": 203614080,
    "vramMB": 376.06,
    "halfPrecision": true,
    "source": "https://huggingface.co/mlc-ai/SmolLM2-360M-Instruct-q4f16_1-MLC",
    "modelCard": "https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct",
    "license": "Apache-2.0"
  },
  {
    "id": "SmolLM2-360M-Instruct-q4f32_1-MLC",
    "name": "SmolLM 2 · 360M — small / FP32",
    "download": "about 210 MB",
    "memory": "about 0.6 GB GPU memory",
    "weightBytes": 203614080,
    "vramMB": 579.61,
    "halfPrecision": false,
    "source": "https://huggingface.co/mlc-ai/SmolLM2-360M-Instruct-q4f32_1-MLC",
    "modelCard": "https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct",
    "license": "Apache-2.0"
  },
  {
    "id": "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
    "name": "SmolLM 2 · 1.7B",
    "download": "about 970 MB",
    "memory": "about 1.8 GB GPU memory",
    "weightBytes": 962793472,
    "vramMB": 1774.19,
    "halfPrecision": true,
    "source": "https://huggingface.co/mlc-ai/SmolLM2-1.7B-Instruct-q4f16_1-MLC",
    "modelCard": "https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct",
    "license": "Apache-2.0"
  },
  {
    "id": "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    "name": "Llama 3.2 · 1B",
    "download": "about 700 MB",
    "memory": "about 0.9 GB GPU memory",
    "weightBytes": 695242752,
    "vramMB": 879.04,
    "halfPrecision": true,
    "source": "https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC",
    "modelCard": "https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct",
    "license": "Llama 3.2 Community"
  },
  {
    "id": "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    "name": "Llama 3.2 · 1B / FP32",
    "download": "about 700 MB",
    "memory": "about 1.1 GB GPU memory",
    "weightBytes": 695242752,
    "vramMB": 1128.82,
    "halfPrecision": false,
    "source": "https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f32_1-MLC",
    "modelCard": "https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct",
    "license": "Llama 3.2 Community"
  },
  {
    "id": "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    "name": "Llama 3.2 · 3B — larger",
    "download": "about 1810 MB",
    "memory": "about 2.3 GB GPU memory",
    "weightBytes": 1807423488,
    "vramMB": 2263.69,
    "halfPrecision": true,
    "source": "https://huggingface.co/mlc-ai/Llama-3.2-3B-Instruct-q4f16_1-MLC",
    "modelCard": "https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct",
    "license": "Llama 3.2 Community"
  },
  {
    "id": "Qwen3-0.6B-q4f16_1-MLC",
    "name": "Qwen 3 · 0.6B",
    "download": "about 340 MB",
    "memory": "about 1.4 GB GPU memory",
    "weightBytes": 335372288,
    "vramMB": 1403.34,
    "halfPrecision": true,
    "source": "https://huggingface.co/mlc-ai/Qwen3-0.6B-q4f16_1-MLC",
    "modelCard": "https://huggingface.co/Qwen/Qwen3-0.6B",
    "license": "Apache-2.0"
  },
  {
    "id": "Qwen3-1.7B-q4f16_1-MLC",
    "name": "Qwen 3 · 1.7B",
    "download": "about 970 MB",
    "memory": "about 2.0 GB GPU memory",
    "weightBytes": 968001536,
    "vramMB": 2036.66,
    "halfPrecision": true,
    "source": "https://huggingface.co/mlc-ai/Qwen3-1.7B-q4f16_1-MLC",
    "modelCard": "https://huggingface.co/Qwen/Qwen3-1.7B",
    "license": "Apache-2.0"
  },
  {
    "id": "gemma-2-2b-it-q4f16_1-MLC",
    "name": "Gemma 2 · 2B",
    "download": "about 1480 MB",
    "memory": "about 1.9 GB GPU memory",
    "weightBytes": 1470915072,
    "vramMB": 1895.3,
    "halfPrecision": true,
    "source": "https://huggingface.co/mlc-ai/gemma-2-2b-it-q4f16_1-MLC",
    "modelCard": "https://huggingface.co/google/gemma-2-2b-it",
    "license": "Gemma"
  }
] as const
