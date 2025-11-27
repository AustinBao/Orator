import os
from openai import OpenAI
from typing import Dict, List, Optional
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize OpenAI client (lazy initialization with better error handling)
def get_openai_client():
    """Get or create OpenAI client"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY not found. Please create a .env file in the backend folder with:\n"
            "OPENAI_API_KEY=your_key_here"
        )
    return OpenAI(api_key=api_key)


class PresentationAnalyzer:
    """
    Analyzes presenter's live transcript against their script to provide real-time feedback
    """
    
    def __init__(self, script: str):
        """
        Initialize the analyzer with the presentation script
        
        Args:
            script: The full script where CAPITALIZED PHRASES are important topics
        """
        self.script = script
        self.highlighted_topics = self._extract_highlighted_topics(script)
        self.previous_feedback = []
        
    def _extract_highlighted_topics(self, script: str) -> List[str]:
        """
        Extract all CAPITALIZED PHRASES from the script as important topics
        
        Args:
            script: The presentation script
            
        Returns:
            List of highlighted topics
        """
        # Find sequences of 2+ capitalized words
        pattern = r'\b[A-Z][A-Z\s]{2,}[A-Z]\b'
        topics = re.findall(pattern, script)
        return [topic.strip() for topic in topics if len(topic.strip()) > 2]
    
    def _count_word_repetitions(self, text: str) -> Dict[str, int]:
        """
        Count consecutive word repetitions to detect stuttering
        
        Args:
            text: The transcript text
            
        Returns:
            Dictionary of words that repeat consecutively and their counts
        """
        words = text.lower().split()
        repetitions = {}
        
        i = 0
        while i < len(words) - 1:
            if words[i] == words[i + 1]:
                count = 1
                word = words[i]
                while i + count < len(words) and words[i] == words[i + count]:
                    count += 1
                if count >= 2:  # At least 2 repetitions
                    repetitions[word] = count
                i += count
            else:
                i += 1
                
        return repetitions
    
    def analyze_presentation(self, live_transcript: str, context_window: Optional[str] = None) -> Dict:
        """
        Analyze the presenter's performance against the script
        
        Args:
            live_transcript: The most recent portion of the live transcript
            context_window: Previous transcript context for continuity
            
        Returns:
            Dictionary containing analysis results and feedback
        """
        # Detect stuttering
        repetitions = self._count_word_repetitions(live_transcript)
        stuttering_detected = len(repetitions) > 0
        
        # Build the full context
        full_context = context_window if context_window else ""
        full_context += " " + live_transcript
        
        # Create the analysis prompt
        prompt = self._build_analysis_prompt(
            live_transcript=live_transcript,
            full_context=full_context,
            repetitions=repetitions
        )
        
        # Call OpenAI API
        try:
            client = get_openai_client()
            response = client.chat.completions.create(
                model="gpt-4o-mini",  # Fast and cost-effective for real-time analysis
                messages=[
                    {
                        "role": "system",
                        "content": """You are a supportive but honest presentation coach.

CRITICAL RULE: You will receive "WHAT THEY JUST SAID" and "PREVIOUS CONTEXT".
- Base your feedback ONLY on "WHAT THEY JUST SAID"
- The context is background info only - they may have already moved past those mistakes
- If "WHAT THEY JUST SAID" is on-topic → Say "✓" (even if context shows past mistakes!)
- If "WHAT THEY JUST SAID" includes "what I meant to say" or "oh sorry" followed by correct topic → That's a RECOVERY, praise it!

CAPITALIZED PHRASES = KEY TOPICS:
- ALL CAPS phrases in the script are IMPORTANT and should be EMPHASIZED
- Proactively warn when they're approaching a capitalized topic: "🎯 Coming up: Emphasize [TOPIC]"
- If they mention a capitalized topic without emphasis, remind them it's a key point

EXAMPLE:
- WHAT THEY JUST SAID: "AI is impacting education"
- CONTEXT: "Clash Royale... video games..."
- CORRECT RESPONSE: "✓" (they're on topic NOW!)
- WRONG RESPONSE: Criticizing Clash Royale (that's in the past!)

When they're currently doing well: "✓"
When approaching a KEY TOPIC: "🎯 Coming up: Emphasize [TOPIC]"
When they're currently off-topic: Gently redirect"""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # Lower temperature for more consistent feedback
                max_tokens=400  # Keep feedback concise
            )
            
            feedback_text = response.choices[0].message.content
            
            # Structure the response
            result = {
                "success": True,
                "feedback": feedback_text,
                "stuttering_detected": stuttering_detected,
                "stuttering_details": repetitions if stuttering_detected else None,
                "highlighted_topics": self.highlighted_topics,
                "timestamp": None  # Will be set by caller
            }
            
            self.previous_feedback.append(result)
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "feedback": None
            }
    
    def _build_analysis_prompt(self, live_transcript: str, full_context: str, repetitions: Dict[str, int]) -> str:
        """
        Build the analysis prompt for OpenAI
        
        Args:
            live_transcript: Recent transcript portion
            full_context: Full transcript context
            repetitions: Detected word repetitions
            
        Returns:
            Formatted prompt string
        """
        highlighted_str = "\n".join([f"- {topic}" for topic in self.highlighted_topics])
        
        stuttering_note = ""
        if repetitions:
            stutter_list = [f"'{word}' (repeated {count} times)" for word, count in repetitions.items()]
            stuttering_note = f"\n\n**STUTTERING DETECTED:** {', '.join(stutter_list)}"
        
        prompt = f""" 
            **PRESENTATION SCRIPT (with HIGHLIGHTED IMPORTANT TOPICS):**
            {self.script}

            **HIGHLIGHTED TOPICS TO EMPHASIZE:**
            {highlighted_str}
            
            **IMPORTANT:** Phrases in ALL CAPS in the script are KEY TOPICS that MUST be emphasized during the presentation. 
            These are critical points the presenter should speak about with energy and clarity.

**WHAT THEY JUST SAID (focus here - this is the current moment):**
"{live_transcript}"

**PREVIOUS CONTEXT (background only - they may have already moved past these mistakes):**
{full_context[-200:]}  
{stuttering_note}

**ANALYSIS RULE:** 
Judge based ONLY on "WHAT THEY JUST SAID" above. 
- If that sentence is on-topic → Say "✓" or encourage them
- If that sentence ends with a correction (e.g., "what I meant to say is [education]") → They recovered, say "✓"
- If that sentence is clearly off-topic → Gently redirect
- Don't criticize things from the context if they've already corrected in the recent statement!

**YOUR JOB:**

You are a SUPPORTIVE coach, not a harsh critic. Only speak up for SIGNIFICANT issues.

**IGNORE these normal presentation behaviors:**
- Self-correction phrases: "oh sorry", "what I meant to say is", "let me clarify", "I should mention"
- If the MOST RECENT sentence is on-topic, even if they mentioned something off-topic before correcting
- Natural conversational flow and self-corrections

**RECOGNIZE RECOVERY PATTERNS - Don't flag these:**
- "Clash Royale... oh sorry... [talks about education]" → They recovered, don't flag!
- "video games... what I meant to say is [education topic]" → They recovered, don't flag!
- Look at the FINAL statement in recent_transcript to judge if they're currently on track

**DO flag these issues:**
1. **Filler words**: Using "uh", "um", "like", "you know" excessively (more than 2-3 times in ONE sentence)
2. **Stuttering**: Repeating words 3+ times in a row
3. **Currently off-topic**: The MOST RECENT sentence is about something unrelated (not old sentences)
4. **Skipping HIGHLIGHTED TOPICS**: Not explaining important capitalized concepts (ALL CAPS phrases)
5. **Too brief**: Rushing through important topics without depth
6. **Missing emphasis**: Speaking about a HIGHLIGHTED TOPIC without energy or emphasis

**PROACTIVE GUIDANCE - Look ahead in the script:**
- If they're approaching a HIGHLIGHTED TOPIC (ALL CAPS phrase) in the next few sentences, give them a heads-up
- Example: "🎯 Coming up: Emphasize [TOPIC NAME]"
- This helps them prepare to speak with energy about important points

**Balance:** Be supportive but honest. If they're clearly off-topic, say so gently. If they're doing well, encourage them.

**CRITICAL - Avoid Repetitive Warnings:**
- Look at the MOST RECENT transcript ONLY to determine current state
- If they mentioned something off-topic earlier BUT are NOW on-topic → Say "✓ Back on track!" NOT another warning
- If the context shows they already corrected themselves → Don't keep criticizing the same old mistake
- Focus on NOW, not what they said 10+ seconds ago

**RESPONSE FORMAT:**

**When they're on track:**
- "✓" or "✓ Good flow!" (keep it very brief)

**When approaching a key topic:**
🎯 Coming up: Emphasize [TOPIC NAME] - Get ready to bring energy!

**When there's a real issue:**
⚠️ [Specific issue]
💡 [Quick actionable tip]

**GOOD Examples:**
- They say: "technology is reshaping education" → Response: "✓"
- They're about to reach a HIGHLIGHTED TOPIC → Response: "🎯 Coming up: Emphasize ARTIFICIAL INTELLIGENCE - Get ready!"
- They say: "video games... what I meant to say is AI impacts education" → Response: "✓ Good recovery!"
- They say: "um uh like technology um impacts uh education" → Response: "⚠️ Too many filler words \n💡 Take a breath"
- They mention a HIGHLIGHTED TOPIC without emphasis → Response: "⚠️ This is a KEY POINT \n💡 Bring more energy and emphasis to [TOPIC]"

**BAD Examples (DON'T do these):**
- They say: "AI is transforming education" but context mentions "Clash Royale" → DON'T flag Clash Royale, they're on topic NOW
- They say: "what I meant to say is education..." → DON'T flag the mistake they're correcting, praise the correction!
- If the most recent sentence is on-topic → DON'T mention off-topic things from previous context

**BALANCE:**
- Flag ONLY if the MOST RECENT sentence itself has the issue
- PRAISE recovery attempts ("what I meant to say", "oh sorry")
- Don't dwell on past mistakes visible in context
- PROACTIVELY warn about upcoming HIGHLIGHTED TOPICS so they can prepare
            """
        return prompt