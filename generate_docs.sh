#!/bin/bash

# Define the output file
OUTPUT_FILE="project_documentation.txt"

# Start by creating/overwriting the output file
echo "Project Documentation - $(date)" > $OUTPUT_FILE
echo "==============================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Function to add file content to the documentation
add_file_to_docs() {
    local filepath="$1"
    local filetype="$2"

    # Add header with file path and type
    echo "File: $filepath" >> $OUTPUT_FILE
    echo "Type: $filetype" >> $OUTPUT_FILE
    echo "------------------------------" >> $OUTPUT_FILE
    cat "$filepath" >> $OUTPUT_FILE
    echo "" >> $OUTPUT_FILE
    echo "" >> $OUTPUT_FILE
}

# Find all relevant files in ~/SoundScreen
find ~/SoundScreen -type f \( \
    -name "*.js" -o \
    -name "*.jsx" -o \
    -name "*.ts" -o \
    -name "*.tsx" -o \
    -name "*.json" -o \
    -name "Dockerfile" -o \
    -name "docker-compose.yml" \
\) | while read filepath; do
    # Determine the file type based on its extension
    case "$filepath" in
        *.js)
            add_file_to_docs "$filepath" "JavaScript (Node/Express)" ;;
        *.jsx)
            add_file_to_docs "$filepath" "JavaScript (React Component)" ;;
        *.ts)
            add_file_to_docs "$filepath" "TypeScript" ;;
        *.tsx)
            add_file_to_docs "$filepath" "TypeScript (React Component)" ;;
        *.json)
            add_file_to_docs "$filepath" "JSON (Config/Package)" ;;
        *Dockerfile)
            add_file_to_docs "$filepath" "Dockerfile" ;;
        *docker-compose.yml)
            add_file_to_docs "$filepath" "Docker Compose YAML" ;;
    esac
done

echo "Documentation generated at $OUTPUT_FILE"
 
