import type ExcelJS from 'exceljs';

/** Сохраняет готовый workbook: Capacitor — «Поделиться», браузер — скачивание. */
export async function downloadWorkbook(buf: ExcelJS.Buffer, fileName: string): Promise<void> {
  const isCapacitor = typeof (window as any).Capacitor !== 'undefined' &&
    (window as any).Capacitor?.isNativePlatform?.();

  if (isCapacitor) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    const base64 = btoa(
      new Uint8Array(buf as ArrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        '',
      ),
    );

    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });

    await Share.share({
      title: fileName,
      url: result.uri,
      dialogTitle: 'Сохранить или отправить файл',
    });
    return;
  }

  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
