import { useRef, useState } from 'react'
import pdfToText from 'react-pdftotext';

interface HighlightRange {
    start: number;
    end: number;
}

export default function Textbox(){
  
    const [transcript, setTranscript] = useState('');
    const [showButtons, setShowButtons] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [highlight, setHighlight] = useState(false);
    const [highlights, setHighlights] = useState<HighlightRange[]>([]);
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
    const highlightRef = useRef<HTMLDivElement | null>(null);


    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>){
        const selected = e.target.files?.[0];
        if (!selected) {
            return; // checks if no file was actually passed
        }
        console.log("PDF file", selected.name)
        setFile(selected)

        pdfToText(selected).then(text => {
            // 'text' now contains the extracted text from the PDF
            // console.log(text);
            setTranscript(text);
            setShowButtons(true);
        }).catch(error => {
            console.error("Failed to extract text from pdf:", error);
        });
    }

    const toggleHighlight = () => {
            setHighlight((prev) => !prev);
    };

    const handleMouseUp = () => {
        if (!highlight || !textAreaRef.current) {
        return;
    }

    const textarea = textAreaRef.current;
    const newStart = textarea.selectionStart;
    const newEnd = textarea.selectionEnd;

    // Only proceed if text is actually selected
    if (newStart === newEnd) {
        return;
    }

    setHighlights(prevHighlights => {
        // Find all highlights that are FULLY CONTAINED within the new selection.
        const highlightsToToggleOff = prevHighlights.filter(h =>
            h.start >= newStart && h.end <= newEnd
        );

        if (highlightsToToggleOff.length > 0) {
            // Case 1: UN-HIGHLIGHTING (Remove all highlights that were fully selected)
            const highlightsToKeep = prevHighlights.filter(h =>
                !(h.start >= newStart && h.end <= newEnd)
            );
            return highlightsToKeep.sort((a, b) => a.start - b.start);
        }

        // Case 2: HIGHLIGHTING (Add new or merge existing ones)
        
        // Find highlights that overlap (not fully contained, but touching/overlapping)
        const overlapping = prevHighlights.filter(h =>
            (newStart < h.end) && (newEnd > h.start)
        );

        if (overlapping.length > 0) {
            // Merge all touching ranges into one large highlight
            const nonOverlapping = prevHighlights.filter(h =>
                (newStart >= h.end) || (newEnd <= h.start)
            );
            
            const mergedStart = Math.min(newStart, ...overlapping.map(h => h.start));
            const mergedEnd = Math.max(newEnd, ...overlapping.map(h => h.end));
            
            return [...nonOverlapping, { start: mergedStart, end: mergedEnd }].sort((a, b) => a.start - b.start);

        }
        
        // Case 3: Adding a completely NEW highlight
        return [...prevHighlights, { start: newStart, end: newEnd }].sort((a, b) => a.start - b.start);
    });

    // Clear selection
    textarea.setSelectionRange(newStart, newStart);
    }

    const renderHighlightedText = () => {
        if (!transcript){
            return;
        }

        if (!highlights.length){
            return <span style={{ color: 'transparent' }}>{transcript}</span>;
        }
        const result: Array<string | React.ReactElement> = [];
        let pos = 0;

        highlights.forEach((h, i) => {
            result.push(transcript.slice(pos, h.start));
            result.push(<mark key={i} className="bg-yellow-400 text-black">{transcript.slice(h.start, h.end)}</mark>);

            pos = h.end;
        });

        result.push(transcript.slice(pos));
        return <>{result}</>;
    };
    
    const getSavedTranscript = () => {
    if (!transcript) {
        return "";
    }

    // If there are no highlights, return the original transcript (or uppercase the whole thing if preferred)
    if (!highlights.length) {
        return transcript; // You could use transcript.toUpperCase() here if you want *everything* uppercase when saved
    }

    const result: string[] = [];
    let pos = 0;

    highlights.forEach((h) => {
        // 1. Add the text *before* the highlight (normal case)
        result.push(transcript.slice(pos, h.start));

        // 2. Add the highlighted text (in UPPER CASE)
        const highlightedSegment = transcript.slice(h.start, h.end);
        result.push(highlightedSegment.toUpperCase());

        // 3. Move the pointer to the end of the highlight
        pos = h.end;
    });

    // 4. Add the remaining text after the last highlight
    result.push(transcript.slice(pos));

    return result.join('');
    };

    const handleSendTranscript = async () => {
        const finalTranscript = getSavedTranscript();
        console.log("Transcript to save:", finalTranscript);
        
        try {
            const response = await fetch("http://127.0.0.1:5000/transcript", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify(finalTranscript),
        });

        const result = await response.json();
        console.log("Response from Flask:", result);
        alert("Saved successfully!");
        } catch (error) {
        console.error("Error sending data:", error);
        }
    };
    


    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            textAreaRef.current?.blur()
            // setLocked(true);
            setShowButtons(true);
        }
    };

    // const refocus = () => {
    //     setLocked(false)
    // }
    const handleBlur = () => {
        setShowButtons(true);
    };
    const syncScroll = () => {
        if (textAreaRef.current && highlightRef.current) {
            highlightRef.current.scrollTop = textAreaRef.current.scrollTop;
            highlightRef.current.scrollLeft = textAreaRef.current.scrollLeft;
        }
    };

    return (
    <div className="text-gray-100 flex flex-col items-center p-6 space-y-6">

        <h2 className="text-xl font-semibold mb-2 text-indigo-300">Upload Transcript</h2>

        <input type="file" accept=".pdf" onChange={handleFileChange}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold"
        />

        <h2 className="text-xl font-semibold mb-2 text-indigo-300">Or</h2>

        <div className="w-full max-w-6xl">
            <div className="relative bg-gray-800 rounded-lg min-h-[200px] whitespace-pre-wrap">
            <div ref={highlightRef}
                aria-hidden="true"
                className="absolute top-0 left-0 w-150 h-full p-4 whitespace-pre-wrap break-words text-white pointer-events-none overflow-y-auto"
            >
                {renderHighlightedText()}
            </div>
            <textarea 
            ref={textAreaRef}
            className="relative bg-transparent caret-white p-4 w-150 h-[200px] resize-none focus:outline-none"
            placeholder="Waiting for speech..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            // onFocus={refocus}
            onMouseUp={handleMouseUp}
            onScroll={syncScroll}
            />
            
        </div>
        
        {showButtons && (
        <div className="flex gap-2 mt-4">
            
            <button className="bg-blue-600 text-white font-semibold hover:bg-blue-800 px-4 py-2 rounded" onClick={handleSendTranscript}>Send Transcript</button>

            <button 
            className={`px-4 py-2 rounded font-semibold ${
                highlight ? 'bg-yellow-400 text-black hover:bg-yellow-500': 'bg-red-600 text-white hover:bg-red-800'}`} 
                onClick={toggleHighlight}
            >
                Highlight Tool
            </button>
        </div>
        )}
        </div>
    </div>
    )
    }