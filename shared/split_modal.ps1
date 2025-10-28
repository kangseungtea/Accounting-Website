# 수리 현황 모달 분리 스크립트
# index.html의 모달 섹션을 별도 파일로 분리

# 수리 현황 모달 (222-326줄) 추출
$lines = Get-Content -Path "index.html" -Encoding UTF8
$repairStatusModal = $lines[221..325]  # 0-based index

# 수리 상세 모달 (328-346줄) 추출
$repairDetailModal = $lines[327..345]  # 0-based index

# 파일로 저장
$repairStatusModal | Out-File -FilePath "repair-status-modal.html" -Encoding UTF8
$repairDetailModal | Out-File -FilePath "repair-detail-modal.html" -Encoding UTF8

Write-Host "모달 파일 분리 완료!"
Write-Host "- repair-status-modal.html (수리 현황 모달)"
Write-Host "- repair-detail-modal.html (수리 상세 모달)"

