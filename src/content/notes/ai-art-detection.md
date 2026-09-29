---
title: 'AI Art Detection: Detecting the Imposter'
subtitle: 'How architecture, pretraining scale, and fine-tuning strategy affect AI-generated art detection'
authors: ['Jiahao Zeng', 'Jiarong Chen', 'Zhiyuan Jia']
date: 2026-05-26
keywords: ['Computer Vision', 'Comparative Study', 'Transfer Learning', 'PyTorch']
highlight: 'CSE 493 Team Project'
---

## Introduction

Can a model distinguish AI-generated artwork from human-created art when only a small labeled dataset is available? Our project compares two visual architectures, three pretraining sources, and two adaptation strategies to examine which choices transfer most effectively to this task.

This note presents our CSE 493 project poster, **“Detecting the Imposter,”** by **Jiahao Zeng, Jiarong Chen, and Zhiyuan Jia**, University of Washington. Across 12 configurations, the strongest test result comes from a ViT-B/16 model pretrained with OpenAI CLIP and adapted using a linear probe: 0.8980 accuracy and 0.8889 F1.

[View the original project poster (PDF)](/documents/ai-art-detection-poster.pdf).

## Motivation

AI-generated artwork has rapidly improved, making it increasingly difficult to distinguish from human-created art. Reliable detection becomes critical for authenticity verification and copyright protection.

We lack a large-scale human-versus-AI dataset for this project. Large pretrained foundation models encode rich semantic representations learned from web-scale data, which may help with detecting the difference between human and AI art. It remains unclear whether detection performance depends more on **model architecture**, **pretraining data scale**, or **adaptation strategy**.

Our research question is: how do model architecture (CNN vs. Transformer), pretraining data (ImageNet-1K vs. ImageNet-21K vs. OpenAI CLIP), and adaptation strategy (linear probe vs. full fine-tuning) interact to determine performance when detecting AI-generated art with limited labeled examples?

## Models

We compare two widely used visual models.

| Property | ResNet-50 (RN50) | Vision Transformer (ViT-B/16) |
| --- | --- | --- |
| Architecture | Convolutional neural network (CNN) | Transformer-based image encoder |
| Feature extraction | Emphasizes local texture and spatial features | Divides the image into 16 × 16 patches |
| Relationships | Strong inductive bias toward locality | Models global relationships via self-attention |
| Approximate model size | 100 MB | 330 MB |
| Modeling strength | Local features | Global context |

## Datasets

### Downstream task: AI vs. human art

We use the **Kaggle AI vs Human Art Dataset** with a balanced class distribution between AI and human artwork.

- Original training set: **950 images**.
- Augmented training data: **6,875 images**, using randomized cropping, cutting out, and color filtering.
- Images are resized and normalized to the same resolution.
- Held-out test set: **198 images**.

### Pretraining sources

| Source | Scale | Pretraining characteristics |
| --- | --- | --- |
| ImageNet-1K | Approximately 1.2 million labeled images; 1,000 object categories | Standard supervised pretraining baseline |
| ImageNet-21K | Approximately 14 million labeled images; 21,000 object categories | Larger supervised pretraining scale |
| OpenAI CLIP | Approximately 400 million image–text pairs | Web-scale multimodal pretraining with rich semantic alignment between vision and language |

## Experimental setup

1. **Data split.** The test set is held out and used only once for final evaluation. A training/validation split of approximately 85/15 is created from the augmented training data.
2. **Preprocessing.** We apply standard ImageNet preprocessing: resizing, center cropping to 224 × 224, conversion to a tensor, and normalization with channel-wise mean and standard deviation.
3. **Initialization.** Models are initialized from ImageNet-1K, ImageNet-21K, or OpenAI CLIP (400M). In every case, the original classification head is replaced with a binary linear layer mapping features to two classes: AI and human.
4. **Adaptation.** In **linear probing**, the base model is frozen and only the classifier is trained. In **full fine-tuning**, all parameters are updated end-to-end.
5. **Training and checkpoint selection.** Models are trained with cross-entropy loss and the Adam optimizer for **10 epochs**. The best checkpoint is selected by validation F1 score. We use the default values specified by the `timm` and `open_clip` libraries for hyperparameters, including learning rate and momentum.
6. **Evaluation.** Performance is evaluated using accuracy, precision, recall, F1 score, and a confusion matrix on the held-out test set.

## Results

### Validation and test performance

The table below reproduces all 12 configurations from the poster. Accuracy and F1 are reported on a 0–1 scale. Bold values identify the best validation and test results within each architecture, matching the highlighted values in the poster.

| Model | Pretraining | Mode | Validation accuracy | Validation F1 | Test accuracy | Test F1 |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| RN50 | ImageNet-1K | Linear probe | 0.8623 | 0.8704 | 0.7653 | 0.7629 |
| RN50 | ImageNet-1K | Full fine-tuning | 0.9884 | 0.9889 | 0.8163 | 0.7907 |
| RN50 | ImageNet-21K | Linear probe | 0.9748 | 0.9738 | 0.7755 | 0.7826 |
| RN50 | ImageNet-21K | Full fine-tuning | **0.9893** | **0.9890** | 0.8061 | 0.7865 |
| RN50 | OpenAI CLIP | Linear probe | 0.8623 | 0.8704 | 0.7857 | 0.7789 |
| RN50 | OpenAI CLIP | Full fine-tuning | 0.9884 | 0.9889 | **0.8265** | **0.8172** |
| ViT-B/16 | ImageNet-1K | Linear probe | 0.8865 | 0.8926 | 0.7857 | 0.7470 |
| ViT-B/16 | ImageNet-1K | Full fine-tuning | 0.9893 | 0.9897 | 0.8367 | 0.8182 |
| ViT-B/16 | ImageNet-21K | Linear probe | 0.9224 | 0.9226 | 0.7959 | 0.7826 |
| ViT-B/16 | ImageNet-21K | Full fine-tuning | **0.9903** | **0.9900** | 0.8061 | 0.7865 |
| ViT-B/16 | OpenAI CLIP | Linear probe | 0.8865 | 0.8926 | **0.8980** | **0.8889** |
| ViT-B/16 | OpenAI CLIP | Full fine-tuning | 0.9893 | 0.9897 | 0.8367 | 0.8367 |

### Average training time

| Training mode | Average training time per configuration |
| --- | ---: |
| Linear probe | 118 seconds |
| Full fine-tuning | 125 seconds |

## Discussion

### Architecture and transferable features

ViT-B/16 achieves the best overall test result with **OpenAI CLIP pretraining and a linear probe**, reaching **0.8889 test F1**. The poster interprets this result as evidence that Transformer-based architectures can better capture global structural patterns in AI-generated art, compared with CNNs' emphasis on local textures.

Across the matched configurations, ViT-B/16's test accuracy is higher than or equal to RN50's. The F1 comparison is more mixed: for example, RN50 has a higher test F1 under ImageNet-1K linear probing. The complete table preserves these differences alongside the overall best result.

### Pretraining scale

The poster emphasizes larger pretraining sources—ImageNet-21K and OpenAI CLIP 400M—and their potential to improve transfer. ImageNet-21K produces the highest validation scores under full fine-tuning for both backbones, while OpenAI CLIP yields the strongest test results. These results suggest that web-scale multimodal training provides useful transferable representations for artistic domains.

### Adaptation and generalization

Full fine-tuning achieves near-perfect validation F1, approximately **0.99**, across configurations. This does not consistently translate into superior test performance. Linear probing achieves the best overall test result, suggesting that full fine-tuning may overfit to dataset-specific features while frozen pretrained representations preserve stronger generalization.

Linear probing also offers lower computational cost in these experiments: average training time is approximately **118 seconds**, compared with **125 seconds** for full fine-tuning. In the best configuration, it combines this lower cost with superior test performance.

The observed validation–test discrepancy, especially for fully fine-tuned models, suggests sensitivity to distribution shift. Aggressive adaptation may reduce robustness on unseen samples.

## Future work

1. **Larger-scale multimodal pretraining.** Would models pretrained on web-scale datasets such as LAION further improve generalization in AI-art detection compared with ImageNet or CLIP 400M?
2. **Robustness under distribution shift.** How do performance and generalization change across unseen artistic styles, new generative models, resolution changes, or image perturbations?
3. **Balancing adaptability and efficiency.** Do parameter-efficient fine-tuning methods such as LoRA provide the adaptability of full fine-tuning while preserving the generalization benefits observed in linear probing?

## Conclusion

In this comparison, the highest validation scores do not identify the strongest test configuration. ViT-B/16 with OpenAI CLIP and a linear probe achieves the best held-out performance, while full fine-tuning produces near-perfect validation scores without a consistent test advantage.

For this small labeled dataset, the results support the value of strong pretrained representations and a lightweight adaptation strategy. The next step is to test whether that advantage holds across new artistic styles, generators, and other distribution shifts.

## References

1. Davide Cozzolino et al. “Raising the Bar of AI-generated Image Detection with CLIP.” *Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition Workshops*, 2024. [Read the paper](https://openaccess.thecvf.com/content/CVPR2024W/WMF/html/Cozzolino_Raising_the_Bar_of_AI-generated_Image_Detection_with_CLIP_CVPRW_2024_paper.html).
2. Anna Yoo Jeong Ha et al. “Organic or Diffused: Can We Distinguish Human Art from AI-generated Images?” *Proceedings of the ACM SIGSAC Conference on Computer and Communications Security*, 2024. [Read on arXiv](https://arxiv.org/abs/2402.03214).
3. Ziyang Ou. “CLIP Embeddings for AI-Generated Image Detection: A Few-Shot Study with Lightweight Classifier.” *arXiv preprint arXiv:2505.10664*, 2025. [Read on arXiv](https://arxiv.org/abs/2505.10664).
