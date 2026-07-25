document.addEventListener("DOMContentLoaded", () => {
    
    console.log("ADP Toolkit Initialized");

    // 1. Search Functionality
    const searchInput = document.getElementById("searchInput");
    const toolCards = document.querySelectorAll(".tool-card");

    if(searchInput) {
        searchInput.addEventListener("input", (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            
            toolCards.forEach(card => {
                const title = card.querySelector("h4").innerText.toLowerCase();
                const description = card.querySelector("p").innerText.toLowerCase();
                
                if(title.includes(searchTerm) || description.includes(searchTerm)) {
                    card.style.display = "flex"; // Tailwind 'block' replaced with flex in our design
                } else {
                    card.style.display = "none";
                }
            });
        });
    }

    // 2. Smart Print Interactive Mockup (For visually demonstrating the workflow)
    const frontUpload = document.getElementById("frontUpload");
    const backUpload = document.getElementById("backUpload");
    const mockFront = document.getElementById("mockFront");
    const mockBack = document.getElementById("mockBack");

    // Initially dim the mockups on the A4 page
    if(mockFront && mockBack) {
        mockFront.style.opacity = "0.2";
        mockBack.style.opacity = "0.2";
    }

    function setupUploadSimulation(element, mockElement, label) {
        if(!element) return;
        
        element.addEventListener("click", () => {
            // Simulate processing time
            element.innerHTML = '<i class="fa-solid fa-spinner fa-spin mb-2 text-2xl text-brandPurple"></i><span class="text-[11px] font-semibold text-brandPurple">Processing...</span>';
            
            setTimeout(() => {
                // Change UI to success state
                element.classList.add("active");
                element.innerHTML = `<i class="fa-solid fa-check-circle mb-2 text-2xl"></i><span class="text-[11px] font-semibold">${label} Ready</span>`;
                
                // Light up the corresponding layout box on the A4 preview
                if(mockElement) {
                    mockElement.style.opacity = "1";
                    mockElement.style.transform = "scale(1.1)";
                    setTimeout(() => mockElement.style.transform = "scale(1)", 200);
                }
            }, 800); // 800ms fake delay
        });
    }

    setupUploadSimulation(frontUpload, mockFront, "Front");
    setupUploadSimulation(backUpload, mockBack, "Back");

});
