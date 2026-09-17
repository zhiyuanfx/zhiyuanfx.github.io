---
title: 'Making large models leaner'
date: 2026-09-16
keywords: ['LLM Sparsity', 'Mixed-integer optimization', 'Placeholder']
---
This placeholder note will document my research on semi-structured and unstructured sparsity in large language models, conducted at UW Industrial & Systems Engineering with Prof. Chaoyue Zhao and Prof. Yuxiang Peng.

## Research overview

The work reformulates SparseGPT’s masking and compensation as a mixed-integer programming problem. A row-wise, layer-wise pipeline reduces peak GPU memory, and a Quantum Hamiltonian Descent mask solver improves reconstruction.

The experiments summarized in my résumé report 70% lower peak GPU memory usage and 50% lower reconstruction error in their respective comparisons.

## Full note coming soon

The complete write-up will explain the formulation, experimental settings, baselines, and limitations. This page is a placeholder, not the full research report.
