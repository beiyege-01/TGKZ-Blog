---
title: '示例 VoxCPM TTS 安装——小雅的声音设计'
description: '按原始教程整理的 VoxCPM 安装、模型测试与 Web 界面启动流程。'
pubDate: '2026-08-01'
updatedDate: '2026-08-01'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

[快速入门 - VoxCPM 2.0 文档](https://voxcpm.readthedocs.io/en/latest/quickstart.html)

# 一、老规矩，新建文件夹，创立隔离环境

```powershell
mkdir E:\voxcpm-project
cd E:\voxcpm-project
```

## 1.1、使用 3.12 创建虚拟环境

```powershell
C:\Users\wrpsg\AppData\Local\Programs\Python\Python312\python.exe -m venv voxcpm_env
```

## 1.2、激活环境

```powershell
.\voxcpm_env\Scripts\Activate.ps1
```

## 1.3、检查版本

```powershell
python --version
```

> 日志示例：

![环境检查示例](/images/tutorials/pasted-image-20260731162232.png)

## 二、安装项目

### 2.1

```powershell
pip install voxcpm
```

![安装 VoxCPM](/images/tutorials/pasted-image-20260731163625.png)

### 2.2

验证 CUDA 显卡加速：

```powershell
python -c "import torch; print('Torch CUDA可用：', torch.cuda.is_available()); print('GPU型号：', torch.cuda.get_device_name(0))"
```

如果上一步出现错误，就是 Python 版本没有对应轮子，卸载 PyTorch 后再去这里找对应轮子：

- https://download.pytorch.org/whl/nightly/cu130/torch/

```powershell
python --version
nvidia-smi
```

![CUDA 与 Python 版本检查](/images/tutorials/pasted-image-20260728001133.png)

> 找到后记得：
>
> 1. 先彻底卸载 CPU 版 torch 三件套
>
> ```powershell
> pip uninstall torch torchvision torchaudio -y
> ```
>
> 2. 清理 pip 缓存，防止它偷懒用旧包
>
> ```powershell
> pip cache purge
> ```
>
> 3. 从清华源 + 官方 nightly/cu130 安装
>
> ```powershell
> pip install --pre torch torchvision torchaudio -i https://pypi.tuna.tsinghua.edu.cn/simple --extra-index-url https://download.pytorch.org/whl/nightly/cu130 --timeout 1000 --no-cache-dir
> ```

成功后：

![PyTorch 安装成功](/images/tutorials/pasted-image-20260731171149.png)

## 三、下载模型并测试

先切换国内镜像：

```powershell
$env:HF_ENDPOINT = "https://hf-mirror.com"
```

运行测试代码（会自动拉取模型）：

```powershell
python -c "
from voxcpm import VoxCPM
import soundfile as sf

model = VoxCPM.from_pretrained(
    'openbmb/VoxCPM2',
    load_denoiser=False,
)

wav = model.generate(
    text='Hello, this is a test of VoxCPM running on my RTX 5060 Ti GPU.',
    cfg_value=2.0,
    inference_timesteps=10,
)

sf.write('test_output.wav', wav, model.tts_model.sample_rate)
print('✅ 音频已保存为 test_output.wav')
"
```

如果拉取失败，从 ModelScope 下载所有文件，放到本地目录，例如：

```text
E:\llama-models\models\voxcpm2\
```

请确保这 7 个文件都在该目录下：

- model.safetensors
- audiovae.pth
- config.json
- tokenizer.json
- tokenizer_config.json
- special_tokens_map.json
- tokenization_voxcpm2.py

然后直接指定本地路径加载：

```powershell
python -c "
from voxcpm import VoxCPM
import soundfile as sf

model = VoxCPM.from_pretrained(
    'E:/llama-models/models/voxcpm2',
    load_denoiser=False,
)

wav = model.generate(
    text='你好，这是使用本地模型文件的测试。',
    cfg_value=2.0,
    inference_timesteps=10,
)

sf.write('test_local.wav', wav, model.tts_model.sample_rate)
print('✅ 音频已保存为 test_local.wav')
"
```

成功后如图：

![本地模型测试成功](/images/tutorials/pasted-image-20260731172615.png)

测试音频文件：

![测试音频结果](/images/tutorials/pasted-image-20260731172733.png)

## 四、如果想要图形界面

```powershell
git clone https://github.com/OpenBMB/VoxCPM.git
cd VoxCPM
pip install -e .
python app.py --port 8877 --host 127.0.0.1 --model-id E:/llama-models/models/voxcpm2
```

![启动 Web 界面](/images/tutorials/pasted-image-20260801111422.png)

## 五、补充说明

速度不满意？ Triton 在 Windows 50 系列显卡上加速效果不太明显，只有大约 5% 左右。换其他项目，或用更低精度模型。
