---
title: 'McCormick Envelopes and Big-M Constraints'
subtitle: 'Two ways to write a product of variables with linear inequalities'
date: 2026-11-16
keywords: ['Mixed-Integer Programming', 'McCormick Envelopes', 'Big-M', 'Linearization']
highlight: 'Study Notes'
---

A linear or mixed-integer linear solver accepts only linear constraints, yet many models contain a product of two decision variables: an on/off decision times an output level, a price times a quantity, a scale factor times a weight. Two standard devices replace such a product with linear inequalities. A big-M constraint uses a binary variable and a large constant to switch a constraint on or off. A McCormick envelope encloses the product between linear inequalities built from the bounds of the two factors. These notes describe both, show that they give the same four inequalities when one factor is binary, and explain why the replacement is exact in that case but only a relaxation when both factors are continuous.

## Big-M: a binary switch

A generator is either off or on. Let the binary variable $z$ record which, and let $y$ be its output in MW, at most 50 when it runs. The output must be zero when the generator is off:

<span id="eq:fixed-charge"></span>

$$
y\leq 50\,z,\qquad z\in\{0,1\}.
\tag{1}
$$

With $z=0$ this reads $y\leq 0$. With $z=1$ it reads $y\leq 50$, which the generator satisfies anyway. The binary variable has switched the constraint $y\leq 0$ on and off.

The general pattern is a **big-M constraint**. Suppose a constraint $a^\top x\leq b$ should hold only when $z=1$. Write

<span id="eq:big-m"></span>

$$
a^\top x\leq b+M(1-z).
\tag{2}
$$

When $z=1$ the extra term vanishes and the constraint is enforced. When $z=0$ the right side grows by $M$, and the constraint no longer restricts anything, provided $M$ is at least as large as the most that $a^\top x-b$ can reach over the feasible set. A constant with this property is **valid**. The name comes from the habit of choosing a number that is certainly big enough when the true bound is unknown. Fixed charges, either-or conditions, and if-then conditions are all modeled this way (Williams, 2013).

## A binary times a continuous variable

Now suppose the model needs the product itself. A plant produces $y$ units, with $0\leq y\leq U$, and a binary $z$ says whether a buyer takes the output. The amount sold is $w=z\,y$, which is not linear. Two switches of the kind in Equation [(2)](#eq:big-m), together with two inequalities that always hold, replace it:

<span id="eq:binary-product"></span>

$$
w\leq U z,\qquad w\leq y,\qquad w\geq y-U(1-z),\qquad w\geq 0.
\tag{3}
$$

The constant $M$ is the bound $U$. Each value of $z$ activates one switch:

| $z$ | $w\leq Uz$ | $w\geq y-U(1-z)$ | With $0\leq w\leq y$ | Result |
| :---: | :--- | :--- | :--- | :--- |
| 0 | active: $w\leq 0$ | off: $w\geq y-U$ | $0\leq w\leq 0$ | $w=0$ |
| 1 | off: $w\leq U$ | active: $w\geq y$ | $y\leq w\leq y$ | $w=y$ |

With $U=50$ and $y=30$, the inequalities force $w=0$ when $z=0$ and $w=30$ when $z=1$. In both cases $w$ equals $z\,y$, so the replacement is exact.

If the continuous variable has a general range $L\leq y\leq U$, the same idea gives

<span id="eq:binary-product-general"></span>

$$
Lz\leq w\leq Uz,\qquad y-U(1-z)\leq w\leq y-L(1-z).
\tag{4}
$$

With $z=0$ the first pair forces $w=0$ and the second pair is slack. With $z=1$ the second pair forces $w=y$ and the first pair is slack.

## McCormick envelopes

The construction in Equation [(4)](#eq:binary-product-general) is a special case of a more general one. Let both factors be continuous, with known bounds:

<span id="eq:bounds"></span>

$$
w=x\,y,\qquad x^L\leq x\leq x^U,\qquad y^L\leq y\leq y^U.
\tag{5}
$$

Each bound says that some difference is nonnegative, for example $x-x^L\geq 0$. The product of two nonnegative differences is nonnegative. Expanding such a product and writing $w$ for $xy$ gives a linear inequality:

| Nonnegative product | Linear inequality |
| :--- | :--- |
| $(x-x^L)(y-y^L)\geq 0$ | $w\geq x^L y+x\,y^L-x^L y^L$ |
| $(x^U-x)(y^U-y)\geq 0$ | $w\geq x^U y+x\,y^U-x^U y^U$ |
| $(x^U-x)(y-y^L)\geq 0$ | $w\leq x^U y+x\,y^L-x^U y^L$ |
| $(x-x^L)(y^U-y)\geq 0$ | $w\leq x^L y+x\,y^U-x^L y^U$ |

The first two bound $w$ from below and are called **underestimators**:

<span id="eq:under"></span>

$$
w\geq x^L y+x\,y^L-x^L y^L,
\qquad
w\geq x^U y+x\,y^U-x^U y^U.
\tag{6}
$$

The last two bound $w$ from above and are called **overestimators**:

<span id="eq:over"></span>

$$
w\leq x^U y+x\,y^L-x^U y^L,
\qquad
w\leq x^L y+x\,y^U-x^L y^U.
\tag{7}
$$

Together they form the **McCormick envelope** of the product (McCormick, 1976). The model keeps $w$ as a separate variable, drops the equation $w=xy$, and adds Equations [(6)](#eq:under) and [(7)](#eq:over). Every point with $w=xy$ satisfies all four inequalities, so no true solution is lost. The reverse can fail: a point may satisfy all four with $w\neq xy$.

Set $x=z$ with bounds 0 and 1, and give $y$ the bounds $L$ and $U$. Equations [(6)](#eq:under) and [(7)](#eq:over) then become $w\geq Lz$, $w\geq y-U(1-z)$, $w\leq y-L(1-z)$, and $w\leq Uz$. These are the inequalities of Equation [(4)](#eq:binary-product-general). The big-M replacement of a binary product is the McCormick envelope with one factor restricted to its two end values.

## When the envelope is exact

How far can $w$ be from the true product? Each inequality came from a product of two differences, and that product is exactly its distance from $xy$. For the first underestimator, $xy-(x^L y+x\,y^L-x^L y^L)=(x-x^L)(y-y^L)$. The same holds for the other three:

| Inequality | Distance between its right side and $xy$ |
| :--- | :--- |
| First underestimator | $(x-x^L)(y-y^L)$ |
| Second underestimator | $(x^U-x)(y^U-y)$ |
| First overestimator | $(x^U-x)(y-y^L)$ |
| Second overestimator | $(x-x^L)(y^U-y)$ |

A distance is zero when either of its two differences is zero. At $x=x^L$, the first underestimator and the second overestimator both have distance zero, so they hold $w$ between $xy$ and $xy$. At $x=x^U$, the second underestimator and the first overestimator do the same. The argument for $y$ is identical. This gives the rule:

**The McCormick envelope forces $w=xy$ whenever at least one factor is at one of its bounds.**

A binary variable is always at a bound, which is why Equations [(3)](#eq:binary-product) and [(4)](#eq:binary-product-general) are exact. A continuous variable usually lies strictly inside its range, and then the envelope leaves room.

<figure class="mcc-figure">
  <img src="/images/mccormick-big-m/envelope-slices.svg" alt="Four panels, each plotting w against y for a fixed value of x, with x between 0 and 1 and y between minus 10 and 10. In each panel a straight line shows the true product w equals x times y and a shaded parallelogram shows the values of w that the four McCormick inequalities allow. At x equal to 0 and at x equal to 1 the parallelogram has collapsed onto the line. At x equal to 0.25 it is up to 5 wide, and at x equal to 0.5 it is up to 10 wide. In every panel the parallelogram narrows to a point at y equal to minus 10 and at y equal to 10." width="1008" height="922" loading="lazy" />
  <figcaption>Figure 1. Slices of the McCormick envelope for 0 ≤ x ≤ 1 and −10 ≤ y ≤ 10. The line is the true product w = xy at the stated x; the shaded region is every w the four inequalities allow. The region collapses onto the line when x is at a bound (top left and bottom right) and at the two ends of the y range in every panel. It is widest when both factors are at the middle of their ranges.</figcaption>
</figure>

For a fixed $x$, the true product is a straight line in $y$ with slope $x$. The allowed region is a parallelogram with that line as its diagonal. The parallelogram closes at both ends of the $y$ range, and it closes completely when $x$ reaches 0 or 1.

## Two continuous factors: a relaxation

Take $0\leq x\leq 2$ and $0\leq y\leq 3$, and look at the point $x=1$, $y=1.5$, where the true product is 1.5:

| Inequality | Value at this point |
| :--- | :--- |
| $w\geq 0$ | lower bound 0 |
| $w\geq 2y+3x-6$ | lower bound 0 |
| $w\leq 2y$ | upper bound 3 |
| $w\leq 3x$ | upper bound 3 |

The envelope allows any $w$ in $[0,3]$. The distances in the previous table explain the size of this interval. The better of the two underestimators is below the product by the smaller of $(x-x^L)(y-y^L)$ and $(x^U-x)(y^U-y)$. That smaller value is largest at the center of the rectangle, where both equal a quarter of its area. The overestimators behave the same way. So the largest error on either side is

<span id="eq:worst-gap"></span>

$$
\max_{x,\,y}\,\bigl|\,w-xy\,\bigr|=\tfrac14\,(x^U-x^L)(y^U-y^L).
\tag{8}
$$

In the example this is $\tfrac14\cdot 2\cdot 3=1.5$, which matches the table.

Equation [(8)](#eq:worst-gap) also shows how to improve the envelope: shrink the bounds. With $0.5\leq x\leq 1.5$ and $1\leq y\leq 2$, the same point allows only $w$ in $[1.25,\,1.75]$, and the largest error falls to $\tfrac14\cdot 1\cdot 1=0.25$. Tighter variable bounds directly give a tighter relaxation.

No set of linear inequalities can be exact. The graph of $w=xy$ over a rectangle is a saddle: it curves upward along one diagonal and downward along the other. Linear inequalities describe a region with flat faces. The McCormick inequalities are the best such region. Al-Khayyal and Falk (1983) showed that the underestimators and overestimators are the convex and concave envelopes of $xy$ over the rectangle, so they describe the convex hull of the surface. The hull touches the surface along the four edges of the rectangle and stands away from it in the interior.

Replacing $w=xy$ with the envelope therefore gives a **relaxation**. Its optimal value bounds the optimal value of the original model, from below for a minimization and from above for a maximization. Its solution may have $w\neq xy$, in which case it is not a solution of the original model.

## Recovering exactness

Two refinements close the gap.

- **Split the range.** Divide the range of $x$ into pieces, use binary variables to select the piece that contains $x$, and apply the envelope within that piece. Equation [(8)](#eq:worst-gap) says the error shrinks in proportion to the piece width. The cost is one binary variable per piece, or fewer with a logarithmic encoding.
- **Branch on the range.** Solve the relaxation. If its solution has $w\neq xy$ by more than a tolerance, split the range of one factor in two, tighten the envelope on each half, and solve both. Repeating this is **spatial branch and bound**, the method that global solvers use for nonconvex products (Tawarmalani and Sahinidis, 2002).

Both keep every subproblem linear. Both also show why a single envelope is attractive when a bound is enough: it adds four inequalities and no binary variables.

## An integer times a continuous variable

A general integer variable $k\in\{0,1,\ldots,K\}$ can lie strictly inside its range, so applying the envelope to $k\,y$ directly is not exact. The standard remedy is to write the integer in binary digits first:

<span id="eq:binary-expansion"></span>

$$
k=\sum_{i=0}^{p}2^{i}\,b_i,\qquad b_i\in\{0,1\},
\qquad\text{so that}\qquad
k\,y=\sum_{i=0}^{p}2^{i}\,(b_i\,y).
\tag{9}
$$

Each product $b_i\,y$ is a binary times a continuous variable and is replaced exactly by Equation [(4)](#eq:binary-product-general). For $k\in\{0,\ldots,7\}$, three digits suffice, at the cost of three binary variables and three auxiliary variables. When $K+1$ is not a power of two, the constraint $k\leq K$ stays in the model.

## Choosing M

In Equation [(3)](#eq:binary-product) the constant was the bound $U$. Any larger constant is also valid, and with $z$ equal to 0 or 1 it gives the same result. The difference appears inside the solver. Branch and bound solves **linear relaxations** in which $z$ may take any value between 0 and 1, and the quality of those relaxations depends on $M$.

Take $U=50$ and $y=30$, and compare $M=50$ with $M=500$ in the four inequalities $w\leq Mz$, $w\leq y$, $w\geq y-M(1-z)$, and $w\geq 0$:

| $z$ | Allowed $w$ with $M=50$ | Allowed $w$ with $M=500$ |
| :---: | :---: | :---: |
| 0 | exactly 0 | exactly 0 |
| 0.1 | 0 to 5 | 0 to 30 |
| 0.5 | 5 to 25 | 0 to 30 |
| 1 | exactly 30 | exactly 30 |

<figure class="mcc-figure">
  <img src="/images/mccormick-big-m/big-m-tightness.svg" alt="Two panels plotting w against z between 0 and 1, for y fixed at 30. Each shows a shaded region of allowed w values and two dots at the integer points, z equals 0 with w equals 0 and z equals 1 with w equals 30. In the left panel, with M equal to 50, the region is a parallelogram between the two dots that covers two fifths of the rectangle. In the right panel, with M equal to 500, the region fills almost the whole rectangle from w equals 0 to w equals 30." width="1008" height="475" loading="lazy" />
  <figcaption>Figure 2. The values of w allowed when z is fractional, for y = 30 and 0 ≤ y ≤ 50. The dots are the two integer points, which both choices of M reproduce exactly. With M = 50, the bound on y, the region is a parallelogram that covers two fifths of the rectangle. With M = 500 it is almost the whole rectangle.</figcaption>
</figure>

A loose relaxation gives weak bounds, and weak bounds mean more branching before the solver can prove optimality. Formulations whose relaxations stay close to the integer solutions tend to solve much faster (Wolsey, 2020). With $M=U$ the four inequalities are the McCormick envelope, which is the convex hull, so no linear description is tighter.

A very large $M$ causes a second problem. A solver accepts a binary value that is within a small tolerance of 0 or 1. If $z=0.000001$ passes as zero and $M=1{,}000{,}000$, the constraint $y\leq Mz$ still allows $y=1$, and the switch leaks.

The practical rule is to compute $M$ from the data of the problem, as the smallest bound that is certainly valid, and to give each constraint its own constant.

## Summary

A big-M constraint lets a binary variable switch a linear constraint on or off, using a constant that must be at least as large as the amount by which the constraint could otherwise be exceeded. A McCormick envelope replaces a product $w=xy$ with four linear inequalities, each the expansion of a product of two nonnegative bound differences. The envelope is exact whenever one factor sits at a bound. For a binary factor that is always the case, and the envelope is then the familiar big-M replacement with $M$ equal to the bound of the continuous factor. For two continuous factors the envelope is the tightest linear relaxation, with a worst error of a quarter of the area of the bound rectangle, and it becomes exact only through splitting or branching on the variable ranges. In both devices, tighter bounds give tighter models.

## References

1. Garth P. McCormick. “Computability of Global Solutions to Factorable Nonconvex Programs: Part I—Convex Underestimating Problems.” *Mathematical Programming*, 10(1):147–175, 1976.
2. Faiz A. Al-Khayyal and James E. Falk. “Jointly Constrained Biconvex Programming.” *Mathematics of Operations Research*, 8(2):273–286, 1983.
3. H. Paul Williams. *Model Building in Mathematical Programming*, 5th edition. Wiley, 2013.
4. Laurence A. Wolsey. *Integer Programming*, 2nd edition. Wiley, 2020.
5. Mohit Tawarmalani and Nikolaos V. Sahinidis. *Convexification and Global Optimization in Continuous and Mixed-Integer Nonlinear Programming*. Kluwer Academic Publishers, 2002.
