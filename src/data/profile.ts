export const sections = ['About', 'Research', 'Projects', 'Experience', 'Publications', 'Notes'];
export const profile = {
  name: 'Zhiyuan Jia',
  lastUpdated: '2026-09-16',
  email: 'zyj3@uw.edu',
  linkedin: 'https://www.linkedin.com/in/zhiyuan-jia-241533295',
  github: 'https://github.com/zhiyuanfx',
  bio: 'I’m a PhD student in Industrial Engineering at the University of Washington, starting in September 2026 and advised by Prof. Chaoyue Zhao. I also completed my undergraduate studies at UW, double majoring in Computer Science and Applied Mathematics. My research focuses on identifying and formulating optimization problems for efficient AI systems, particularly LLM sparsification and guided sampling. To solve these problems, I adapt advanced algorithms like Quantum Hamiltonian Descent for performance gains over classical methods. I’m currently also exploring optimization models to help small business owners be more resilient to external market shocks.',
};
export const news: { date: string; label: string; text: string; href?: string }[] = [
  { date: '2026-09', label: '09/2026', text: 'Began PhD studies in Industrial Engineering at UW.' },
  { date: '2026-06', label: '06/2026', text: 'Graduated from UW with a BS in Computer Science and Applied Mathematics.' },
  { date: '2026-05', label: '05/2026', text: 'Submitted the QIPrune preprint to NeurIPS 2026.' },
];
export const research = [
  { id: 'llm-sparsity', noteId: 'llm-sparsity', keywords: ['LLM Sparsity', 'Mixed-integer optimization'], tag: 'LLM SPARSITY', cardTitle: 'Masking unimportant weights', cardShort: 'Training-free. Less memory. Faster inference.', title: 'Making large models leaner', short: 'Less memory. Better masks. More efficient language models.', description: 'I study semi-structured and unstructured sparsity in LLMs, reformulating SparseGPT’s masking and compensation as a mixed-integer programming problem. A row-wise, layer-wise pipeline reduces peak GPU memory, while a Quantum Hamiltonian Descent mask solver improves reconstruction.', metrics: ['70% lower peak GPU memory', '50% lower reconstruction error'], visual: 'network' },
  { id: 'guided-sampling', noteId: 'guided-llm-sampling', keywords: ['Guided Sampling', 'Language Models'], tag: 'GUIDED SAMPLING', cardTitle: 'Making a base model smarter', cardShort: 'Training-free. Same model, better output.', title: 'Better reasoning through sampling', short: 'Steering generation with principled, efficient sampling methods.', description: 'I explore guided sampling strategies for LLMs to match reinforcement learning performance. Block-wise power sampling and token-wise inverse conditional probabilities improve efficiency and single-shot accuracy on MATH500.', metrics: ['35% less computation time', '10% higher single-shot accuracy'], visual: 'paths' },
  { id: 'quantum-optimization', noteId: 'quantum-hamiltonian-descent', keywords: ['Global Optimization', 'Quantum Hamiltonian Descent'], tag: 'GLOBAL OPTIMIZATION', cardTitle: 'Beyond local solutions', cardShort: 'Quantum-inspired methods for challenging optimization problems.', title: 'Beyond local solutions', short: 'Quantum-inspired methods for challenging optimization problems.', description: 'I investigate Quantum Hamiltonian Descent for non-smooth, non-convex optimization. My work combines QHD with Sequential Quadratic Programming and automated experiments to study its ability to reach globally optimal solutions.', metrics: ['50+ benchmark functions', '2,000+ test instances'], visual: 'contours' },
];
export const projects = [{ noteId: 'ai-art-detection', keywords: ['Computer Vision', 'Comparative Study'], title: 'AI Art Detection', subtitle: 'CNN vs Transformer', technologies: ['Python', 'PyTorch', 'OpenCLIP', 'timm'], description: 'Can a model distinguish AI-generated artwork from human-created art? I built and compared ResNet-50 and ViT-B/16 classifiers across 12 architecture, pretraining, and adaptation combinations.', detail: 'The full transfer learning pipeline includes preprocessing, augmentation, training, early stopping, and evaluation. ViT-B/16 with CLIP and linear probing achieved 15% higher test accuracy than standard supervised baselines.' }];
export const experience = [
  { noteId: 'guided-llm-sampling', date: 'Dec 2025 — Present', organization: 'UW · Paul G. Allen School', role: 'Research Assistant', people: 'Collaborating with Dr. Mars Gao and Dr. Yikun Zhang', text: 'Developing guided LLM sampling strategies, including block-wise power sampling and adaptive suffix resampling. Exploring semantic blocks and their scaling limitations.' },
  { noteId: 'llm-sparsity', date: 'Jun 2025 — Present', organization: 'UW · Industrial & Systems Engineering', role: 'Research Assistant', people: 'Advised by Prof. Chaoyue Zhao and Prof. Yuxiang Peng', text: 'Studying sparsity in large language models through mixed-integer formulations, memory-efficient SparseGPT pipelines, and QHD-based mask optimization.' },
  { noteId: 'quantum-hamiltonian-descent', date: 'Mar 2024 — May 2025', organization: 'UW · Industrial & Systems Engineering', role: 'Research Assistant', people: 'Advised by Prof. Chaoyue Zhao and Prof. Lei Fan', text: 'Implemented QHD-driven Sequential Quadratic Programming and automated experiments for non-smooth, non-convex optimization. This work contributed to a paper submitted to Operations Research.' },
];
export const education = [
  { date: 'Expected 2026 — 2031', title: 'PhD · Industrial Engineering', detail: 'University of Washington · Advisor Prof. Chaoyue Zhao' },
  { date: '2022 — 2026', title: 'BS · Computer Science & Applied Mathematics', detail: 'University of Washington · Double major · GPA 4.00/4.00 · Dean’s List 2022–2026' },
];
export const publications = [{ noteId: 'quantum-hamiltonian-descent', keywords: ['Optimization'], title: 'Quantum Hamiltonian Descent for Non-smooth Optimization', authors: 'Jiaqi Leng, Yufan Zheng, Zhiyuan Jia, Lei Fan, Chaoyue Zhao, et al.', year: '2025', status: 'arXiv preprint · Submitted to Operations Research', href: 'https://arxiv.org/abs/2503.15878' }];

export const noteUrl = (id: string) => `/notes/${id}/`;
