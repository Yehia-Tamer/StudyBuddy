from faster_whisper import WhisperModel
from langchain_core.documents import Document

class AudioTranscriptError(Exception):
    pass

_model=None

def get_whisper_model():
    global _model
    if _model is None:
        _model=WhisperModel("base",device="cpu",compute_type="int8")

    return _model

def transcribe_audio(file_path:str):
    model=get_whisper_model()

    try:
        segments,info=model.transcribe(file_path)
        segments=list(segments)
    except Exception as e:
        raise AudioTranscriptError(f"Failed to transcribe audio: {e}")

    if not segments:
        raise AudioTranscriptError("No speech detected in audio file")

    return segments

def chunk_audio_with_timestamps(segments,filename:str,chunk_size:int=800,chunk_overlap:int=150,overlap_segments: int = 2) -> list[Document]:
    chunks = []
    chunks=[]
    buffer_segments=[]
    buffer_len=0

    for segment in segments:
        text=segment.text.strip()
        if not text:
            continue

        buffer_segments.append(segment)
        buffer_len+=len(text)+1

        if buffer_len>=chunk_size:
            chunk_text=' '.join(s.text.strip() for s in buffer_segments)
            chunks.append(
                Document(
                    page_content=chunk_text,
                    metadata={
                        "source_type":"audio",
                        "filename":filename,
                        "timestamp_seconds":buffer_segments[0].start
                    }
                )
            )

            buffer_segments=buffer_segments[-overlap_segments]
            buffer_len=sum(len(s.text.strip())+1 for s in buffer_segments)

    if buffer_segments:
        chunk_text=' '.join(s.text.strip() for s in buffer_segments)
        chunks.append(
            Document(
                page_content=chunk_text,
                metadata={
                    "source_type":"audio",
                    "filename":filename,
                    "timestamp_seconds":buffer_segments[0].start
                }
            )
        )

    return chunks

def load_audio_document(file_path:str,filename:str)->list[Document]:
    segments=transcribe_audio(file_path)
    chunks=chunk_audio_with_timestamps(segments,filename)

    if not chunks:
        raise AudioTranscriptError(f"Transcript for {filename} was empty after processing")

    return chunks
