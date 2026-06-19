import sys
try:
    import PyPDF2
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyPDF2"])
    import PyPDF2

def extract_text(pdf_path, txt_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        with open(txt_path, 'w', encoding='utf-8') as out_file:
            for page_num in range(len(reader.pages)):
                page = reader.pages[page_num]
                text = page.extract_text()
                if text:
                    out_file.write(f"--- PAGE {page_num + 1} ---\n")
                    out_file.write(text + "\n\n")

if __name__ == "__main__":
    extract_text("d:/Tradeos-platform/report trade os.pdf", "d:/Tradeos-platform/report_extracted.txt")
    print("Extraction complete.")
