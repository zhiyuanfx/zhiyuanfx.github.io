---
title: 'Notes on optimization: a mathematical playground'
date: 2026-09-01
keywords: ['Optimization', 'Linear algebra', 'Demo']
---
This demonstration post is a placeholder for future research notes. It explores optimization and provides a small mathematical playground for testing equations, search, and reading on different screens.

## From a landscape to a solution

Optimization begins with an objective. For a differentiable function $f : \mathbb{R}^n \to \mathbb{R}$, a gradient step follows

$$
x_{k+1} = x_k - \eta_k \nabla f(x_k).
$$

The step size $\eta_k > 0$ controls how far we travel. Optimization is sensitive to this choice: too small, and progress is slow; too large, and iterates may diverge.

## A quadratic example

Consider a positive-definite matrix and a quadratic objective:

$$
\begin{aligned}
A &= \begin{bmatrix} 4 & 1 \\ 1 & 3 \end{bmatrix},
& b &= \begin{bmatrix} 1 \\ 2 \end{bmatrix}, \\
f(x) &= \frac{1}{2}x^\top A x - b^\top x,
& \nabla f(x) &= Ax-b.
\end{aligned}
$$

The minimizer solves $Ax^\star=b$. Completing the square gives a useful identity:

$$
f(x)-f(x^\star)=\frac{1}{2}(x-x^\star)^\top A(x-x^\star)\geq 0.
$$

## Beyond smooth objectives

A regularized problem can introduce non-smooth terms:

$$
\min_{x\in\mathbb{R}^n}\;\underbrace{\frac{1}{2}\lVert Ax-b\rVert_2^2}_{\text{data fit}} + \lambda\sum_{i=1}^{n}|x_i|.
$$

This is a useful starting point for thinking about sparsity, proximal methods, and global optimization. This article illustrates mathematical notation; it does not report new research results.

### Literal search examples

Search treats punctuation literally: `a+b`, `[matrix]`, and `x.*` are ordinary strings. The word banana is included to exercise non-overlapping substring matching.
