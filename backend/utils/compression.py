"""
File compression utilities for document uploads
"""
import io
from PIL import Image
from werkzeug.datastructures import FileStorage
from typing import Tuple, Optional

def compress_image(file: FileStorage, max_width: int = 1920, quality: int = 85) -> Tuple[FileStorage, int]:
    """
    Compress image files while maintaining quality
    
    Args:
        file: Original file
        max_width: Maximum width for resizing
        quality: JPEG quality (1-100)
    
    Returns:
        Tuple of (compressed_file, original_size)
    """
    try:
        # Get original file size
        file.seek(0, 2)  # Seek to end
        original_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        # Open image
        image = Image.open(file)
        
        # Convert RGBA to RGB if necessary
        if image.mode in ('RGBA', 'LA'):
            # Create white background
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'RGBA':
                background.paste(image, mask=image.split()[-1])
            else:
                background.paste(image)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize if too large
        if image.width > max_width:
            ratio = max_width / image.width
            new_height = int(image.height * ratio)
            image = image.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
        # Compress to bytes
        output = io.BytesIO()
        image.save(output, format='JPEG', quality=quality, optimize=True)
        output.seek(0)
        
        # Create new FileStorage object
        compressed_file = FileStorage(
            stream=output,
            filename=file.filename,
            content_type='image/jpeg',
            content_length=output.getbuffer().nbytes
        )
        
        return compressed_file, original_size
        
    except Exception as e:
        print(f"Error compressing image: {e}")
        # Return original file if compression fails
        file.seek(0)
        return file, file.tell()

def compress_pdf(file: FileStorage) -> Tuple[FileStorage, int]:
    """
    Compress PDF files (placeholder - would need PyPDF2 or similar)
    
    Args:
        file: Original PDF file
    
    Returns:
        Tuple of (compressed_file, original_size)
    """
    # For now, return original file
    # In production, you'd use PyPDF2 or similar library
    file.seek(0, 2)
    original_size = file.tell()
    file.seek(0)
    return file, original_size

def compress_document(file: FileStorage, max_size_mb: float = 5.0, quality: int = 85) -> Tuple[FileStorage, int, bool]:
    """
    Compress document based on file type
    
    Args:
        file: Original file
        max_size_mb: Maximum file size in MB before compression
        quality: Image quality for JPEG compression
    
    Returns:
        Tuple of (compressed_file, original_size, was_compressed)
    """
    # Get original file size
    file.seek(0, 2)
    original_size = file.tell()
    file.seek(0)
    
    # Check if file needs compression
    file_size_mb = original_size / (1024 * 1024)
    
    if file_size_mb <= max_size_mb:
        # File is small enough, no compression needed
        return file, original_size, False
    
    # Determine file type and compress accordingly
    content_type = file.content_type or ''
    
    if content_type.startswith('image/'):
        # Compress images
        compressed_file, _ = compress_image(file, quality=quality)
        return compressed_file, original_size, True
    
    elif content_type == 'application/pdf':
        # Compress PDFs
        compressed_file, _ = compress_pdf(file)
        return compressed_file, original_size, True
    
    else:
        # For other file types, return original
        return file, original_size, False

def get_compression_stats(original_size: int, compressed_size: int) -> dict:
    """
    Calculate compression statistics
    
    Args:
        original_size: Original file size in bytes
        compressed_size: Compressed file size in bytes
    
    Returns:
        Dictionary with compression stats
    """
    if original_size == 0:
        return {
            'compression_ratio': 0,
            'size_reduction_percent': 0,
            'bytes_saved': 0
        }
    
    compression_ratio = compressed_size / original_size
    size_reduction_percent = ((original_size - compressed_size) / original_size) * 100
    bytes_saved = original_size - compressed_size
    
    return {
        'compression_ratio': round(compression_ratio, 2),
        'size_reduction_percent': round(size_reduction_percent, 2),
        'bytes_saved': bytes_saved,
        'original_size_mb': round(original_size / (1024 * 1024), 2),
        'compressed_size_mb': round(compressed_size / (1024 * 1024), 2)
    }
