import librosa
import soundfile as sf
import numpy as np
import os

# 대상 파일 리스트
input_dir = '/Users/two_jyy/project_openSW/thinkthing/sound_files'
output_dir = '/Users/two_jyy/project_openSW/thinkthing/static/new_sound_files'
start_index = 25
end_index = 36

index = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
# 타겟 길이 (초 단위)
target_length = 4.0

# 파일 처리 루프
for i in range(start_index, end_index + 1):
    filename = f'{input_dir}/{i}.wav'
    output_filename = f'{output_dir}/{index[(i-start_index) % len(index)]}4.wav'
    
    # 음원 파일 불러오기
    y, sr = librosa.load(filename, sr=None)
    
    # 현재 길이 계산
    current_length = librosa.get_duration(y=y, sr=sr)
    
    # 시간 스트레치 비율 계산
    stretch_ratio = current_length / target_length
    
    # 시간 스트레치 적용 (피치 유지)
    hop_length = 512
    n_fft = 2048
    
    # STFT 계산
    D = librosa.stft(y, n_fft=n_fft, hop_length=hop_length)
    
    # Phase vocoder 사용
    D_stretched = librosa.phase_vocoder(D, rate=stretch_ratio, hop_length=hop_length)
    
    # ISTFT를 통해 시간 도메인 신호로 변환
    y_stretched = librosa.istft(D_stretched, hop_length=hop_length)
    
    # RMS 크기 조정 / 소리의 크키 
    original_rms = np.sqrt(np.mean(y**2))
    stretched_rms = np.sqrt(np.mean(y_stretched**2))
    
    if stretched_rms > 0:
        y_stretched = y_stretched * (original_rms / stretched_rms)
    
    # 스트레치된 음원 저장
    sf.write(output_filename, y_stretched, sr)
    
    print(f"Stretched audio saved as {output_filename}")

print("All files have been processed and saved.")
