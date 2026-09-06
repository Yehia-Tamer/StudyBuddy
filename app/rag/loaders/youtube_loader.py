import re
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
from langchain_core.documents import Document


class YoutubeTranscriptError(Exception):
    pass


def get_video_id(url: str) -> str | None:
    patterns = [
        r"(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})",
        r"(?:https?://)?(?:www\.)?youtube\.com/embed/([a-zA-Z0-9_-]{11})",
        r"(?:https?://)?(?:www\.)?youtu\.be/([a-zA-Z0-9_-]{11})",
    ]

    for pattern in patterns:
        match = re.match(pattern, url)
        if match:
            return match.group(1)

    return None


def fetch_transcript(url: str):
    video_id = get_video_id(url)
    if not video_id:
        raise YoutubeTranscriptError(f"Could not find a video ID from the url: {url}")

    try:
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)
    except (TranscriptsDisabled, NoTranscriptFound) as e:
        raise YoutubeTranscriptError(
            f"No transcript available for the video with ID {video_id}: {e}"
        )

    except Exception as e:
        raise YoutubeTranscriptError(f"Failed to fetch transcript from the video: {e}")

    transcript_data = None

    for t in transcript_list:
        if t.language_code == "en":
            if not t.is_generated:
                transcript_data = t.fetch()
                break
            elif transcript_data is None:
                transcript_data = t.fetch()

    if transcript_data is None:
        raise YoutubeTranscriptError(
            f"No english transcript found for the video {video_id}"
        )

    return transcript_data


def chunk_transcript_with_timestamps(
    transcript_data, url: str, chunk_size: int = 800, overlap_segments: int = 2
) -> list[Document]:
    chunks = []
    buffer_segments = []
    buffer_len = 0

    for segment in transcript_data:
        text = segment.text.strip()
        if not text:
            continue

        buffer_segments.append(segment)
        buffer_len += len(text) + 1

        if buffer_len >= chunk_size:
            chunk_text = " ".join(s.text.strip() for s in buffer_segments)
            chunks.append(
                Document(
                    page_content=chunk_text,
                    metadata={
                        "source_type": "youtube",
                        "source_url": url,
                        "timestamp_seconds": buffer_segments[0].start,
                    },
                )
            )
            buffer_segments = buffer_segments[-overlap_segments:]
            buffer_len = sum(len(s.text.strip()) + 1 for s in buffer_segments)

    if buffer_segments:
        chunk_text = " ".join(s.text.strip() for s in buffer_segments)
        chunks.append(
            Document(
                page_content=chunk_text,
                metadata={
                    "source_type": "youtube",
                    "source_url": url,
                    "timestamp_seconds": buffer_segments[0].start,
                },
            )
        )

    return chunks


def load_youtube_document(
    url: str, chunk_size: int = 800, chunk_overlap_segments: int = 2
) -> list[Document]:
    transcript_data = fetch_transcript(url)

    chunks = chunk_transcript_with_timestamps(
        transcript_data,
        url=url,
        chunk_size=chunk_size,
        overlap_segments=chunk_overlap_segments,
    )

    if not chunks:
        raise YoutubeTranscriptError(f"Transcript for {url} was empty after processing")

    return chunks
