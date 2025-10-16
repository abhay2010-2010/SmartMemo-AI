interface PDFGeneratorOptions {
  title: string
  content: string
  filename: string
}

export const generatePDF = async ({ title, content, filename }: PDFGeneratorOptions) => {
  try {
    // Dynamically import jspdf to avoid SSR issues
    const { jsPDF } = await import("jspdf")

    // Create a new PDF document
    const doc = new jsPDF()

    // Set font size and add title
    doc.setFontSize(16)
    doc.text(title, 20, 20)

    // Add a line under the title
    doc.setLineWidth(0.5)
    doc.line(20, 25, 190, 25)

    // Set font size for content and add content
    doc.setFontSize(12)

    // Split the content into lines that fit within the page width
    const splitText = doc.splitTextToSize(content, 170)

    // Add the content starting from position (20, 35)
    doc.text(splitText, 20, 35)

    // Save the PDF
    doc.save(filename)
  } catch (error) {
    console.error("Error generating PDF:", error)
    alert("Failed to generate PDF. Please try again.")
  }
}
