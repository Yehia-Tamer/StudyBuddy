from app.rag.loaders.pptx_loader import load_and_split_pptx


chunks=load_and_split_pptx(r"C:\Users\yehia Nour\Desktop\StudyBuddy\test.pptx")

for chunk in chunks:
    print(f"\nMetadata: {chunk.metadata}\n")