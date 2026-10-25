from typing import List, Literal, Dict, Any
from ..models.chat import CitationModel


ExportFormat = Literal["txt", "md", "chatgpt_prompt"]


class ExportService:
    def format_passages(
        self,
        citations: List[Dict[str, Any]],
        format_type: ExportFormat,
        question: str = "Anna University Syllabus Query"
    ) -> Dict[str, str]:
        if format_type == "txt":
            lines = [f"=== Retrieved Evidence Passages for: {question} ===\n"]
            for i, cit in enumerate(citations, 1):
                lines.append(f"Passage {i}: {cit.get('docTitle')} ({cit.get('pageOrSection')})")
                lines.append(f"Book: {cit.get('bookReference', 'N/A')}")
                lines.append(f"Chapter: {cit.get('chapter', 'N/A')}")
                lines.append(f"Score: {cit.get('relevanceScore', 0.9) * 100:.1f}%")
                lines.append(f"Content:\n{cit.get('chunkText')}\n")
                lines.append("-" * 50)
            return {
                "format": "txt",
                "filename": "retrieved_evidence.txt",
                "content": "\n".join(lines),
                "contentType": "text/plain"
            }
        
        elif format_type == "md":
            lines = [f"# Retrieved Evidence Passages\n\n**Query:** {question}\n\n---\n"]
            for i, cit in enumerate(citations, 1):
                lines.append(f"### Passage {i}: {cit.get('docTitle')}")
                lines.append(f"- **Reference:** *{cit.get('bookReference', 'Textbook')}*, {cit.get('chapter', 'Chapter')} ({cit.get('pageOrSection')})")
                lines.append(f"- **Relevance:** `{cit.get('relevanceScore', 0.9) * 100:.1f}%`\n")
                lines.append(f"> {cit.get('chunkText')}\n")
                if cit.get('parentText'):
                    lines.append(f"<details><summary>Parent Context</summary>\n\n{cit.get('parentText')}\n</details>\n")
                lines.append("\n---\n")
            return {
                "format": "md",
                "filename": "retrieved_evidence.md",
                "content": "\n".join(lines),
                "contentType": "text/markdown"
            }
        
        else: # "chatgpt_prompt"
            prompt_lines = [
                f"I am preparing for my Anna University examination on the topic: '{question}'.",
                "Below are the verified textbook passages retrieved from my syllabus curriculum. Please answer my question strictly using only the facts provided in these passages:",
                "\n[RETRIEVED SYLLABUS PASSAGES]"
            ]
            for i, cit in enumerate(citations, 1):
                prompt_lines.append(f"\n[Source {i}: {cit.get('bookReference', cit.get('docTitle'))} - {cit.get('pageOrSection')}]")
                prompt_lines.append(f'"{cit.get("chunkText")}"')
            
            prompt_lines.append("\n[INSTRUCTIONS]")
            prompt_lines.append("Provide a clear, structured study answer with definitions, key keywords, and cite the sources above.")
            return {
                "format": "chatgpt_prompt",
                "filename": "chatgpt_grounded_prompt.txt",
                "content": "\n".join(prompt_lines),
                "contentType": "text/plain"
            }


export_service = ExportService()
