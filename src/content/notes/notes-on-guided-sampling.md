---
title: 'Notes on guided sampling: probability in motion'
date: 2026-09-10
keywords: ['Sampling', 'Language models', 'Probability', 'Demo']
---
This demonstration post is a placeholder for future research notes. Sampling connects probability distributions to the sequences we actually observe. Here we use sampling to test the note’s mathematics and live search.

## A distribution over sequences

An autoregressive language model factors a sequence probability into conditional distributions:

$$
p_\theta(x_{1:T}) = \prod_{t=1}^{T} p_\theta(x_t\mid x_{<t}).
$$

Sampling one token at a time produces a complete sequence. Changing the distribution changes the balance between concentration and diversity.

## Power sampling

For a finite set of possible outcomes, a power-transformed distribution is

$$
\begin{aligned}
q_\alpha(x) &= \frac{p(x)^\alpha}{Z_\alpha}, \\
Z_\alpha &= \sum_{y\in\mathcal{X}}p(y)^\alpha, \qquad \alpha > 0.
\end{aligned}
$$

When $\alpha=1$, we recover the original distribution. Larger values emphasize more probable outcomes. This sampling example is explanatory rather than a claim of improved model performance.

## Expectations and estimation

For a continuous density, an expectation and its Monte Carlo estimate take the form

$$
\mathbb{E}_{X\sim p}[g(X)] = \int_{\mathbb{R}^d}g(x)p(x)\,\mathrm{d}x
\approx \frac{1}{N}\sum_{i=1}^{N}g(X_i).
$$

A deliberately long equation checks that mathematical content can scroll locally on small screens:

$$
\log p_\theta(x_1,x_2,x_3,x_4,x_5) = \log p_\theta(x_1) + \log p_\theta(x_2\mid x_1) + \log p_\theta(x_3\mid x_1,x_2) + \log p_\theta(x_4\mid x_1,x_2,x_3) + \log p_\theta(x_5\mid x_1,x_2,x_3,x_4).
$$

## What comes next

Future notes may explore guided sampling, block-wise resampling, and the tradeoff between computation and reasoning accuracy. For now, this is a demonstration article, ready to be replaced by a real post.
