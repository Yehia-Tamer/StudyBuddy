from app.rag.loaders.web_loader import load_web_document


c=load_web_document("https://www.google.com")

for chunk in c:
    print('\n\n'.join(chunk.page_content))