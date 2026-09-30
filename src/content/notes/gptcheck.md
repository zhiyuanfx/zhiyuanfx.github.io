---
title: 'GPTCheck: AI-Generated Text Detection'
subtitle: 'From a fine-tuned language model to an interactive website'
authors: ['Zhiyuan Jia', 'Yuekai Xu']
date: 2024-08-20
keywords: ['NLP', 'AI Text Detection', 'DeBERTa', 'React', 'Flask']
---

GPTCheck is a website we built to estimate whether a passage is AI-generated or human-written. It connects a fine-tuned DeBERTa model to a simple interface for submitting text and viewing the model’s prediction.

## What we built

- **Text checking.** Users paste a passage and receive an estimated AI-generated probability with a readable result. The interface includes a character counter and input-length validation.
- **Interactive feedback.** A loading indicator shows when a request is running, users can cancel a submission, and error messages handle connection failures. Text and results are preserved when navigating to the About Us page and back.
- **Prediction API.** A Flask endpoint accepts text as JSON, runs the classifier, and returns a score for the frontend to display.

## How we built it

We fine-tuned **DeBERTa-v3-small** for binary text classification using **PyTorch and Hugging Face Transformers**. The training pipeline removes duplicate texts, filters selected prompts, and uses a stratified 80/20 training–validation split. Text is tokenized to a maximum of 512 tokens, and the model is trained with AdamW and evaluated with accuracy and a classification report.

The **Flask** backend loads the saved model and tokenizer, runs inference on a GPU when available or on the CPU, and converts model outputs into probabilities with softmax. The **React and TypeScript** frontend uses asynchronous Fetch requests and AbortController for submission and cancellation.

Our model received a **bronze medal and a top-8% finish** in Kaggle’s *LLM – Detect AI Generated Text* competition. The website presents the classifier’s score through a small, accessible workflow. Its intermediate “mixed” label is based on score thresholds; the underlying model is a binary classifier.

[View the project on GitHub](https://github.com/zhiyuanfx/GPTCheck) · [Watch the demo](https://www.youtube.com/watch?v=XXjCVB6AzVg)
