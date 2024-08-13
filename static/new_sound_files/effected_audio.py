import librosa
import soundfile as sf
import numpy as np
import os
# 음정 올리기 
# 대상 파일 리스트
input_dir = '../sound_files'
output_dir = '../new_sound_files'
start_index = 26
end_index = 37

# 타겟 길이 (초 단위)
target_length = 4.0

# 파일 처리 루프
for i in range(start_index, end_index + 1):
    filename = f'{input_dir}/{i}.wav'
    output_filename = f'{output_dir}/stretched_audio_{i+12}.wav'
    
    # 음원 파일 불러오기
    y, sr = librosa.load(filename, sr=None)
    
    # 음정을 한 옥타브 올리기 (12 반음 올리기)
    y_shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=12)
    
    # 현재 길이 계산
    current_length = librosa.get_duration(y=y_shifted, sr=sr)
    
    # 시간 스트레치 비율 계산
    stretch_ratio = current_length / target_length
    
    # 시간 스트레치 적용 (피치 유지)
    hop_length = 512
    n_fft = 2048
    
    # STFT 계산
    D = librosa.stft(y_shifted, n_fft=n_fft, hop_length=hop_length)
    
    # Phase vocoder 사용
    D_stretched = librosa.phase_vocoder(D, rate=stretch_ratio, hop_length=hop_length)
    
    # ISTFT를 통해 시간 도메인 신호로 변환
    y_stretched = librosa.istft(D_stretched, hop_length=hop_length)
    
    # RMS 크기 조정 / 소리의 크기 
    original_rms = np.sqrt(np.mean(y_shifted**2))
    stretched_rms = np.sqrt(np.mean(y_stretched**2))
    
    if stretched_rms > 0:
        y_stretched = y_stretched * (original_rms / stretched_rms)
    
    # 스트레치된 음원 저장
    sf.write(output_filename, y_stretched, sr)
    
    print(f"Stretched audio saved as {output_filename}")

print("All files have been processed and saved.")
