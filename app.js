// Build the DOM content dynamically
const app = document.getElementById("app");
app.innerHTML = `
    <div class="container">
        <h1>Creative Writing</h1>

        <!-- API Key Section -->
        <div class="section api-key-section">
            <div class="section-header">API Key</div>
            <label for="apiKey">Gemini API Key:</label>
            <input type="password" id="apiKey" placeholder="Enter your Gemini API key" />
        </div>

        <!-- Image Prompt Section -->
        <div class="section">
            <div class="section-header">Image Prompt</div>
            <div class="upload-section">
                <div class="input-controls">
                    <input type="file" id="topicImageInput" accept="image/*" capture="environment" multiple />
                    <button id="topicCameraButton" class="camera-button">
                        <i class="fas fa-camera"></i> Use Camera
                    </button>
                </div>
                <button id="generateTopicButton" disabled>Generate Description</button>
                <div id="topicImagePreviewContainer"></div>
            </div>
            <div class="loading" id="topicGenerationLoading">
                Generating description...
            </div>
            <button id="toggleTopicResultButton" disabled>Show Description</button>
            <div id="writingTopicResult"></div>
        </div>

        <!-- Student Writing Section -->
        <div class="section">
            <div class="section-header">Student Writing</div>
            <div class="upload-section">
                <div class="input-controls">
                    <input type="file" id="handwritingInput" accept="image/*" capture="environment" multiple />
                    <button id="handwritingCameraButton" class="camera-button">
                        <i class="fas fa-camera"></i> Use Camera
                    </button>
                </div>
                <button id="handwritingBtn" disabled>Extract Text</button>
                <div id="handwritingPreviewContainer"></div>
            </div>
            <div class="loading" id="handwritingLoading">
                Processing handwriting...
            </div>
            <button id="toggleHandwritingResultButton" disabled>Show Extracted Text</button>
            <div id="handwritingResult"></div>
            <div style="margin-top: 10px;">
                <button id="editHandwritingButton">Edit Text</button>
                <button id="saveHandwritingButton" disabled>Save Text</button>
            </div>
        </div>

        <!-- Feedback Generation Section -->
        <div class="section">
            <div class="section-header">Feedback Generation</div>
            <button id="generateFeedbackButton">Generate Feedback</button>
            <div id="feedbackResult"></div>
        </div>
    </div>
`;

// Global variables to store multiple images and processed file keys
let topicImageElements = [];
let processedTopicFiles = new Set();
let handwritingImageElements = [];

// --------------------------
// JavaScript functionality
// --------------------------
// Configuration
const GEMINI_API_KEY = "";

// DOM Elements
const apiKeyInput = document.getElementById("apiKey");
const topicImageInput = document.getElementById("topicImageInput");
const generateTopicButton = document.getElementById("generateTopicButton");
const topicGenerationLoading = document.getElementById(
	"topicGenerationLoading"
);
const writingTopicResult = document.getElementById("writingTopicResult");
const toggleTopicResultButton = document.getElementById(
	"toggleTopicResultButton"
);

const handwritingInput = document.getElementById("handwritingInput");
const handwritingBtn = document.getElementById("handwritingBtn");
const handwritingLoading = document.getElementById("handwritingLoading");
const handwritingResult = document.getElementById("handwritingResult");
const toggleHandwritingResultButton = document.getElementById(
	"toggleHandwritingResultButton"
);

// Event Listeners for Image Description Generation
topicImageInput.addEventListener("change", handleTopicImageUpload);
generateTopicButton.addEventListener("click", generateImageDescription);

function handleTopicImageUpload(event) {
    const files = event.target.files;
    const previewContainer = document.getElementById("topicImagePreviewContainer");
    if (files.length > 0) {
        Array.from(files).forEach((file) => {
            // Create a unique key for the file using its name and lastModified date
            const fileKey = file.name + "_" + file.lastModified;
            if (processedTopicFiles.has(fileKey)) {
                // Skip files that were already processed
                return;
            }
            processedTopicFiles.add(fileKey);
            const reader = new FileReader();
            reader.onload = function (e) {
                // Create container for image and action icons
                const container = document.createElement("div");
                container.style.position = "relative";
                container.style.display = "inline-block";
                container.style.margin = "5px";
                
                const img = document.createElement("img");
                img.src = e.target.result;
                // Set a fixed thumbnail height while keeping aspect ratio
                img.style.height = "150px";
                img.style.width = "auto";
                img.style.display = "block"; // helps remove any inline gaps
                container.appendChild(img);
                
                // Create zoom icon button at top left corner
                const zoomIcon = document.createElement("button");
                zoomIcon.innerHTML = "<i class='fas fa-search-plus'></i>";
                zoomIcon.style.position = "absolute";
                zoomIcon.style.top = "0px";
                zoomIcon.style.left = "0px";
                zoomIcon.style.background = "transparent";
                zoomIcon.style.border = "none";
                zoomIcon.style.color = "#2196f3";
                zoomIcon.style.cursor = "pointer";
                zoomIcon.style.fontSize = "16px";
                zoomIcon.style.zIndex = "10";
                zoomIcon.addEventListener("click", () => {
                    if (zoomIcon.innerHTML.indexOf("fa-search-plus") !== -1) {
                        img.style.height = "auto";
                        img.style.maxWidth = "90%";
                        zoomIcon.innerHTML = "<i class='fas fa-search-minus'></i>";
                    } else {
                        // Reset to thumbnail size
                        img.style.height = "150px";
                        img.style.width = "auto";
                        zoomIcon.innerHTML = "<i class='fas fa-search-plus'></i>";
                    }
                });
                container.appendChild(zoomIcon);
                
                // Create remove icon button at top right corner
                const removeIcon = document.createElement("button");
                removeIcon.innerHTML = "<i class='fas fa-times'></i>";
                removeIcon.style.position = "absolute";
                removeIcon.style.top = "0px";
                removeIcon.style.right = "0px";
                removeIcon.style.background = "transparent";
                removeIcon.style.border = "none";
                removeIcon.style.color = "red";
                removeIcon.style.cursor = "pointer";
                removeIcon.style.fontSize = "16px";
                removeIcon.style.zIndex = "10";
                removeIcon.addEventListener("click", () => {
                    container.remove();
                    topicImageElements = topicImageElements.filter(
                        (element) => element !== img
                    );
                });
                container.appendChild(removeIcon);
                
                previewContainer.appendChild(container);
                topicImageElements.push(img);
                generateTopicButton.disabled = false;
            };
            reader.readAsDataURL(file);
        });
    }
}

async function callGeminiAPI(
	imageElements = null,
	prompt,
	model = "gemini-2.0-flash-001",
	formatType = "default"
) {
	const apiKey = apiKeyInput.value.trim();
	if (!apiKey) {
		alert("Please enter your Gemini API key");
		return;
	}

	let parts = [{ text: prompt }];
	if (imageElements && imageElements.length) {
		imageElements.forEach((img) => {
			const imageBase64 = img.src.split(",")[1];
			parts.push({
				inline_data: {
					mime_type: "image/jpeg",
					data: imageBase64,
				},
			});
		});
	}

	const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

	const requestBody = {
		contents: [
			{
				parts: parts,
			},
		],
		generationConfig: {
			temperature: 1,
			topP: 0.95,
			topK: 40,
			maxOutputTokens: 8192,
		},
	};

	const response = await fetch(apiUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(requestBody),
	});

	if (!response.ok) {
		const errorData = await response.json();
		console.error("API Error:", errorData);
		throw new Error(
			`API error: ${errorData.error?.message || "Unknown error"}`
		);
	}

	const data = await response.json();
	if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
		throw new Error("Invalid response from API");
	}

	const data_text = data.candidates[0].content.parts[0].text;
	let formattedText;
	if (formatType === "extracted-text") {
		formattedText = data_text
			.replace(/\n/g, "<br>")
			.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
			.replace(/\*(.*?)\*/g, "<em>$1</em>")
			.trim();
		return `<div class="extracted-text"><pre>${formattedText}</pre></div>`;
	} else {
		formattedText = data_text
			.replace(/\n\n/g, "</p><p>")
			.replace(/\n/g, "<br>")
			.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
			.replace(/\*(.*?)\*/g, "<em>$1</em>");
		return `<div class="markdown-content"><p>${formattedText}</p></div>`;
	}
}

async function generateImageDescription() {
	topicGenerationLoading.style.display = "block";
	generateTopicButton.disabled = true;
	writingTopicResult.style.display = "none";
	toggleTopicResultButton.textContent = "Show Description";

	const prompt = `
        Describe the image in details for using as writing prompt.
        - Look at the image and describe what you see in detail
        - State the main elements, colors, subjects, and any text visible in the image
        - Identify the writing task requirements shown in or implied by the image
        - Summarize how this image serves as a writing prompt
    `;
	const model = "gemini-2.0-flash";
	try {
		const description = await callGeminiAPI(topicImageElements, prompt, model);
		writingTopicResult.innerHTML = description;
		updateFeedbackButtonState(); // update button state after content update
		return description;
	} catch (error) {
		console.error("Error:", error);
		alert(
			`Error: ${
				error.message || "Error generating description. Please try again."
			}`
		);
	} finally {
		topicGenerationLoading.style.display = "none";
		generateTopicButton.disabled = false;
	}
}

// Event Listeners for Handwriting Processing
handwritingInput.addEventListener("change", handleHandwritingUpload);
handwritingBtn.addEventListener("click", extractTextFromImage);

function handleHandwritingUpload(event) {
	const files = event.target.files;
	handwritingImageElements = [];
	const previewContainer = document.getElementById(
		"handwritingPreviewContainer"
	);
	previewContainer.innerHTML = "";
	if (files.length > 0) {
		Array.from(files).forEach((file) => {
			const reader = new FileReader();
			reader.onload = function (e) {
				// Create container for image and action icons
				const container = document.createElement("div");
				container.style.position = "relative";
				container.style.display = "inline-block";
				container.style.margin = "5px";

				const img = document.createElement("img");
				img.src = e.target.result;
				img.style.width = "150px"; // thumbnail size
				container.appendChild(img);

				// Create remove icon button using Font Awesome
				const removeIcon = document.createElement("button");
				removeIcon.innerHTML = "<i class='fas fa-times'></i>";
				removeIcon.style.position = "absolute";
				removeIcon.style.top = "5px";
				removeIcon.style.right = "5px";
				removeIcon.style.background = "transparent";
				removeIcon.style.border = "none";
				removeIcon.style.color = "red";
				removeIcon.style.cursor = "pointer";
				removeIcon.style.fontSize = "16px";
				removeIcon.addEventListener("click", () => {
					container.remove();
					handwritingImageElements = handwritingImageElements.filter(
						(element) => element !== img
					);
					if (handwritingImageElements.length === 0) {
						handwritingBtn.disabled = true;
					}
				});
				container.appendChild(removeIcon);

				// Create zoom icon button using Font Awesome
				const zoomIcon = document.createElement("button");
				zoomIcon.innerHTML = "<i class='fas fa-search-plus'></i>";
				zoomIcon.style.position = "absolute";
				zoomIcon.style.bottom = "5px";
				zoomIcon.style.left = "5px";
				zoomIcon.style.background = "transparent";
				zoomIcon.style.border = "none";
				zoomIcon.style.color = "#2196f3";
				zoomIcon.style.cursor = "pointer";
				zoomIcon.style.fontSize = "16px";
				zoomIcon.addEventListener("click", () => {
					if (zoomIcon.innerHTML.indexOf("fa-search-plus") !== -1) {
						img.style.width = "auto";
						img.style.maxWidth = "90%";
						zoomIcon.innerHTML = "<i class='fas fa-search-minus'></i>";
					} else {
						img.style.width = "150px";
						zoomIcon.innerHTML = "<i class='fas fa-search-plus'></i>";
					}
				});
				container.appendChild(zoomIcon);

				previewContainer.appendChild(container);
				handwritingImageElements.push(img);
				handwritingBtn.disabled = false;
			};
			reader.readAsDataURL(file);
		});
	} else {
		alert("No file selected. Please upload a handwriting image.");
	}
}

async function extractTextFromImage() {
	handwritingLoading.style.display = "block";
	handwritingBtn.disabled = true;
	handwritingResult.style.display = "none";
	toggleHandwritingResultButton.textContent = "Show Extracted Text";

	const prompt = `Extract ALL text from the image ONLY adding any additional text.`;
	const model = "gemini-2.0-flash-lite-preview-02-05";

	try {
		const extractedText = await callGeminiAPI(
			handwritingImageElements,
			prompt,
			model,
			"extracted-text"
		);
		handwritingResult.innerHTML = extractedText;
		savedHandwritingText = "";
		saveHandwritingButton.disabled = true;
		updateFeedbackButtonState(); // update button state after content update
		return extractedText;
	} catch (error) {
		console.error("Error:", error);
		alert(
			`Error: ${
				error.message ||
				"Error extracting text from handwriting image. Please try again."
			}`
		);
	} finally {
		handwritingLoading.style.display = "none";
		handwritingBtn.disabled = false;
	}
}

const writingAssessmentRubric = `
    WRITING ASSESSMENT RUBRIC (25 MARKS)

    1. Story Structure and Plot Flow (2 marks)
        - 2 marks: Clear beginning, middle, and end; logical sequence of events; smooth transitions.
        - 1 mark: Basic structure with awkward transitions; some events appear disconnected.
        - 0 marks: No clear structure; random events; confusing sequence.
    2. Topic Relevance (5 marks)
        - 5 marks: The essay fully and consistently addresses the assigned prompt with deep, nuanced understanding; every section is directly relevant.
        - 4 marks: Largely addresses the prompt with minor deviations; most content is relevant with only slight off-topic areas.
        - 3 marks: Moderately addresses the prompt; key elements are included but with noticeable gaps or generalizations.
        - 2 marks: Limited engagement with the prompt; significant portions are off-topic.
        - 1 mark: Barely touches the topic with isolated references; largely off-topic.
        - 0 marks: Fails to address the prompt entirely.
    3. Atmosphere and Theme (2 marks)
        - 2 marks: Vivid setting details that reinforce the theme; effective use of sensory cues.
        - 1 mark: Basic atmosphere with an inconsistent mood.
        - 0 marks: Lacks clear atmosphere and theme.
    4. Sensory Details (2 marks)
        - 2 marks: Incorporates multiple sensory details naturally.
        - 1 mark: Some sensory details present, but they may feel forced.
        - 0 marks: Limited or superficial sensory detail.
    5. Character Development (2 marks)
        - 2 marks: Main character displays clear growth and distinct personality.
        - 1 mark: Some development present; character traits are basic.
        - 0 marks: Flat characters with no development.
    6. Sizzling Start (1 mark)
        - 1 mark: Begins with engaging action, dialogue, or intrigue.
        - 0 marks: Generic or slow start.
    7. Conflict Development (2 marks)
        - 2 marks: Clear central conflict with creative complications and a satisfying resolution.
        - 1 mark: Basic conflict with predictable progression.
        - 0 marks: Unclear or absent conflict.
    8. Figurative Language (3 marks)
        - 3 marks: Effective use of three or more types of figurative language.
        - 2 marks: Uses two types effectively.
        - 1 mark: Uses one type, or uses multiple types ineffectively.
        - 0 marks: No apparent use of figurative language.
    9. Moral/Theme Message (2 marks)
        - 2 marks: Moral or underlying message is naturally and thoughtfully integrated.
        - 1 mark: Obvious or forced moral message.
        - 0 marks: Lacks a clear moral or message.
    10. Ending (2 marks)
        - 2 marks: Concludes with a surprising yet logical ending; ties up loose ends.
        - 1 mark: Concludes adequately but predictably.
        - 0 marks: Abrupt or illogical ending.
    11. Original Idea (1 mark)
        - 1 mark: Presents a fresh perspective or unique plot elements.
        - 0 marks: Relies on clichéd or derivative ideas.
    12. Technical Accuracy (1 mark)
        - 1 mark: Few to no spelling/grammar errors and proper punctuation.
        - 0 marks: Frequent errors and poor technical execution.
`;

const feedbackTemplate = `
    ### Detailed Rubric Assessment

    [For each criterion]:

    1. [Criterion Name] (_/_ marks)
        - Evidence: [Direct quote]
        - Analysis: [Specific evaluation]
        - Score Justification: [Clear reasoning]
        - Improvement Strategy: [Actionable advice]

    Continue numbering sequentially for each new criterion.

    ### Overall Assessment

    - Total Score: _/25 (_%)
    - Key Strengths: [3 specific elements]
    - Priority Improvements: [3 actionable items]
    - Strategic Development Plan: [Personalized roadmap]
`;

const feedbackExample = `
    ### Detailed Rubric Assessment

    1. Story Structure and Plot Flow (2/2 marks)
        - Evidence: Clear progression from introduction ("I was made of water") through daily observations to final melting ("I cracked, and like the mighty titanic")
        - Analysis: Strong chronological flow with clear beginning, middle, and end
        - Score Justification: Perfect transitions between paragraphs and logical sequence of events
        - Improvement Strategy: Already strong - continue using clear temporal markers to maintain flow
    2. Topic Relevance (5/5 marks)
        - Evidence: "I've overlooked the coast of Westralis... staring at the twisting snake like roads, and little wooden houses"
        - Analysis: Directly addresses the prompt's iceberg and community elements
        - Score Justification: Every paragraph connects to the prompt's visual elements
        - Improvement Strategy: Continue integrating visual details with narrative elements
    3. Atmosphere and Theme (2/2 marks)
        - Evidence: "cruel, relentless waves" and "fierce wind dances around me"
        - Analysis: Creates a strong atmosphere of endurance and protection
        - Score Justification: Consistent mood throughout with vivid environmental details
        - Improvement Strategy: Continue developing atmosphere through sensory details
    4. Sensory Details (2/2 marks)
        - Evidence: "fierce wind... razor sharp claws", "morning light bathed the world"
        - Analysis: Strong use of multiple senses - touch, sight, sound
        - Score Justification: Natural integration of sensory elements throughout
        - Improvement Strategy: Could explore taste and smell in future writings
    5. Character Development (2/2 marks)
        - Evidence: Transformation from proud guardian to accepting its fate
        - Analysis: Clear personality development of the iceberg character
        - Score Justification: Strong character arc with emotional depth
        - Improvement Strategy: Could explore more internal thoughts in future pieces
    6. Sizzling Start (1/1 mark)
        - Evidence: "I was made of water, frozen into an iceberg"
        - Analysis: Immediately establishes unique perspective
        - Score Justification: Engaging opening that draws reader in
        - Improvement Strategy: Continue experimenting with unique perspectives
    7. Conflict Development (2/2 marks)
        - Evidence: Ongoing battle with elements - "cruel, relentless waves", "fierce wind"
        - Analysis: Clear external conflict with nature and internal conflict with inevitable fate
        - Score Justification: Well-developed conflict with satisfying resolution
        - Improvement Strategy: Consider adding more complications before resolution
    8. Figurative Language (3/3 marks)
        - Evidence: "proud lion, protecting its cub", "snake like roads", "summer's spell"
        - Analysis: Multiple metaphors, similes, and personification used effectively
        - Score Justification: Three or more types used naturally throughout
        - Improvement Strategy: Continue varying figurative language types
    9. Moral/Theme Message (2/2 marks)
        - Evidence: Theme of accepting fate and protective guardianship
        - Analysis: Natural integration of themes about change and duty
        - Score Justification: Themes emerge organically through narrative
        - Improvement Strategy: Continue developing layered themes
    10. Ending (2/2 marks)
        - Evidence: "like the mighty titanic, I trembled and my head sank"
        - Analysis: Powerful, inevitable conclusion that ties to earlier themes
        - Score Justification: Satisfying resolution that connects to story's themes
        - Improvement Strategy: Consider varying ending types in future pieces
    11. Original Idea (1/1 mark)
        - Evidence: Unique perspective of iceberg as narrator
        - Analysis: Fresh take on the prompt through unexpected viewpoint
        - Score Justification: Highly original approach to the scene
        - Improvement Strategy: Continue exploring unexpected perspectives
    12. Technical Accuracy (1/1 mark)
        - Evidence: Generally strong grammar and spelling
        - Analysis: Minor errors don't impede understanding
        - Score Justification: High level of technical proficiency
        - Improvement Strategy: Review compound words (everylast, hankerchiefs)
    ### Overall Assessment
    - Total Score: 25/25 (100%)
    - Key Strengths:
        1. Exceptional use of personification and perspective
        2. Strong thematic development and emotional resonance
        3. Masterful integration of figurative language
    - Priority Improvements:
        1. Perfect compound word spelling (e.g., "every last" instead of "everylast")
        2. Could explore more sensory details (smell, taste)
        3. Consider adding more complications before resolution
    - Strategic Development Plan:
        Continue developing your strong creative voice by:
        1. Experimenting with different narrative perspectives
        2. Incorporating all five senses in descriptions
        3. Building more complex conflict structures while maintaining your excellent use of figurative language and thematic depth
`;

async function generateFeedback() {
	const feedbackResult = document.getElementById("feedbackResult");
	feedbackResult.textContent = "Generating feedback...";
	feedbackResult.classList.remove("feedback-box"); // Remove class while loading

	const handwritingText =
		savedHandwritingText || handwritingResult.textContent.trim();
	const writingTopic = writingTopicResult.textContent;

	const prompt = `
        You are an expert writing evaluator designed to provide comprehensive, consistent, and constructive feedback on GATE student writing. Your analysis combines technical assessment strictly following the below writing assessment rubric with empathetic guidance to help students improve their writing skills.
        
        ## INFORMATION OF WRITING
        - Time Constraint: Student essays written in 25 minutes
        - Scoring Range: 0-20 marks
        - This is the creative writing with the writing topic from an image whose description is as follows:
        ${writingTopic}
        - The student's writing is as follows:
        ${handwritingText}
        
        ## EVALUATION PROTOCOL

        A. First Pass: Holistic Review
        - Read complete essay 
        - Identify main themes and approaches
        - Note initial impressions
        
        B. Second Pass: Detailed Analysis
        Score each criterion using the rubric below:
        ${writingAssessmentRubric}
        
        ## FEEDBACK GENERATION:
        Follow the feedback template and example below to provide detailed, constructive feedback to the student.

        ### Feedback Template
        ${feedbackTemplate}
        
        ### Feedback Example
        ${feedbackExample}
    `;
	const model = "gemini-2.0-flash-001";
	try {
		const feedback = await callGeminiAPI(null, prompt, model);
		feedbackResult.innerHTML = marked.parse(feedback);
		feedbackResult.classList.add("feedback-box"); // Apply class after loading
	} catch (error) {
		console.error("Error:", error);
		alert(
			`Error: ${
				error.message || "Error generating feedback. Please try again."
			}`
		);
	}
}

const generateFeedbackButton = document.getElementById(
	"generateFeedbackButton"
);
generateFeedbackButton.disabled = true;

function updateFeedbackButtonState() {
	const writingTopicContent = writingTopicResult.textContent.trim();
	const handwritingContent = handwritingResult.textContent.trim();

	// Enable feedback button only if both texts are available
	generateFeedbackButton.disabled = !(
		writingTopicContent && handwritingContent
	);

	// Toggle 'Show Description' button
	if (writingTopicContent) {
		toggleTopicResultButton.disabled = false;
		toggleTopicResultButton.style.opacity = "1";
	} else {
		toggleTopicResultButton.disabled = true;
		toggleTopicResultButton.style.opacity = "0.5";
	}

	// Toggle 'Show Extracted Text' button
	if (handwritingContent) {
		toggleHandwritingResultButton.disabled = false;
		toggleHandwritingResultButton.style.opacity = "1";
	} else {
		toggleHandwritingResultButton.disabled = true;
		toggleHandwritingResultButton.style.opacity = "0.5";
	}
}

generateFeedbackButton.addEventListener("click", generateFeedback);
writingTopicResult.addEventListener("input", updateFeedbackButtonState);
handwritingResult.addEventListener("input", updateFeedbackButtonState);
updateFeedbackButtonState();

// Camera functionality
const topicCameraButton = document.getElementById("topicCameraButton");
const handwritingCameraButton = document.getElementById(
	"handwritingCameraButton"
);

async function openCamera(inputElement) {
	try {
		const stream = await navigator.mediaDevices.getUserMedia({
			video: { facingMode: "environment" },
		});
		const video = document.createElement("video");
		video.srcObject = stream;

		const modal = document.createElement("div");
		modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

		const captureButton = document.createElement("button");
		captureButton.textContent = "Capture";
		captureButton.style.cssText = `
            margin-top: 20px;
            padding: 10px 20px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;

		modal.appendChild(video);
		modal.appendChild(captureButton);
		document.body.appendChild(modal);

		await video.play();

		captureButton.onclick = () => {
			const canvas = document.createElement("canvas");
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			canvas.getContext("2d").drawImage(video, 0, 0);

			canvas.toBlob((blob) => {
				const file = new File([blob], `captured-image-${Date.now()}.jpg`, {
					type: "image/jpeg",
				});
				const dataTransfer = new DataTransfer();

				// Retain existing files if any
				for (let i = 0; i < inputElement.files.length; i++) {
					dataTransfer.items.add(inputElement.files[i]);
				}

				// Add the new captured file
				dataTransfer.items.add(file);

				inputElement.files = dataTransfer.files;

				const event = new Event("change", { bubbles: true });
				inputElement.dispatchEvent(event);
			}, "image/jpeg");

			stream.getTracks().forEach((track) => track.stop());
			document.body.removeChild(modal);
		};
	} catch (err) {
		console.error("Error accessing camera:", err);
		alert(
			"Could not access the camera. Please make sure you have granted camera permissions."
		);
	}
}

topicCameraButton.addEventListener("click", () => openCamera(topicImageInput));
handwritingCameraButton.addEventListener("click", () =>
	openCamera(handwritingInput)
);

const editHandwritingButton = document.getElementById("editHandwritingButton");
const saveHandwritingButton = document.getElementById("saveHandwritingButton");
let savedHandwritingText = "";

// Initially disable the Edit Text button
editHandwritingButton.disabled = true;
editHandwritingButton.style.opacity = "0.5"; // Grey out the button

editHandwritingButton.addEventListener("click", function () {
	handwritingResult.contentEditable = "true";
	handwritingResult.style.border = "1px dashed #666";
	editHandwritingButton.disabled = true;
	editHandwritingButton.style.opacity = "0.5"; // Grey out the button
	saveHandwritingButton.disabled = false;
	saveHandwritingButton.style.opacity = "1"; // Enable the button
});

saveHandwritingButton.addEventListener("click", function () {
	handwritingResult.contentEditable = "false";
	handwritingResult.style.border = "1px solid #ddd";
	saveHandwritingButton.disabled = true;
	saveHandwritingButton.style.opacity = "0.5"; // Grey out the button
	editHandwritingButton.disabled = false;
	editHandwritingButton.style.opacity = "1"; // Enable the button
	savedHandwritingText = handwritingResult.textContent.trim();
	updateFeedbackButtonState();
});

toggleHandwritingResultButton.addEventListener("click", function () {
	if (handwritingResult.style.display === "none") {
		handwritingResult.style.display = "block";
		toggleHandwritingResultButton.textContent = "Hide Extracted Text";
		// Enable the Edit Text button when extracted text is shown
		editHandwritingButton.disabled = false;
		editHandwritingButton.style.opacity = "1"; // Enable the button
	} else {
		handwritingResult.style.display = "none";
		toggleHandwritingResultButton.textContent = "Show Extracted Text";
		// Disable the Edit Text button when extracted text is hidden
		editHandwritingButton.disabled = true;
		editHandwritingButton.style.opacity = "0.5"; // Grey out the button
	}
});

toggleTopicResultButton.addEventListener("click", function () {
	if (writingTopicResult.style.display === "none") {
		writingTopicResult.style.display = "block";
		toggleTopicResultButton.textContent = "Hide Description";
	} else {
		writingTopicResult.style.display = "none";
		toggleTopicResultButton.textContent = "Show Description";
	}
});

// Remove or comment out this duplicate toggle listener
// toggleHandwritingResultButton.addEventListener("click", function () {
//     if (handwritingResult.style.display === "none") {
//         handwritingResult.style.display = "block";
//         toggleHandwritingResultButton.textContent = "Hide Extracted Text";
//     } else {
//         handwritingResult.style.display = "none";
//         toggleHandwritingResultButton.textContent = "Show Extracted Text";
//     }
// });

/**
 * Adds a copy button next to the given result element.
 * The copy button displays a Font Awesome icon and copies the result's text to the clipboard.
 */
function addCopyButton(resultId) {
    const resultElem = document.getElementById(resultId);
    if (!resultElem) return;

    // Only add copy btn if there is content and one hasn't been added already
    if (!resultElem.textContent.trim()) return;
    if (resultElem.nextElementSibling && resultElem.nextElementSibling.classList.contains("copy-button")) return;

    const copyBtn = document.createElement("button");
    copyBtn.innerHTML = "<i class='fas fa-copy'></i>";
    copyBtn.classList.add("copy-button"); // Prevent duplicate buttons
    // Style the icon button (you can adjust these styles in your CSS)
    Object.assign(copyBtn.style, {
        marginLeft: "10px",
        padding: "5px",
        fontSize: "16px",
        cursor: "pointer",
        border: "none",
        background: "transparent",
    });

    copyBtn.addEventListener("click", () => {
        const textToCopy = resultElem.innerText;
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                copyBtn.innerHTML = "<i class='fas fa-check'></i>";
                setTimeout(() => {
                    copyBtn.innerHTML = "<i class='fas fa-copy'></i>";
                }, 2000);
            })
            .catch((err) => console.error("Failed to copy text:", err));
    });

    resultElem.parentNode.insertBefore(copyBtn, resultElem.nextSibling);
}

/**
 * Attaches a MutationObserver to the specified result element.
 * When text content becomes available (or is updated), the observer calls addCopyButton().
 */
function observeForCopyButton(resultId) {
    const resultElem = document.getElementById(resultId);
    if (!resultElem) return;

    // Create the observer and add the copy button if text is present and not already added
    const observer = new MutationObserver(() => {
        if (resultElem.textContent.trim() && 
            !(resultElem.nextElementSibling && resultElem.nextElementSibling.classList.contains("copy-button"))) {
            addCopyButton(resultId);
        }
    });
    observer.observe(resultElem, { childList: true, subtree: true, characterData: true });
}

// Set up observers once the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    // List all result element IDs that need a copy button when content becomes available
    ["writingTopicResult", "handwritingResult", "feedbackResult"].forEach(observeForCopyButton);
});
