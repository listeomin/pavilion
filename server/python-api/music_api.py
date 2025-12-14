#!/usr/bin/env python3
# server/python-api/music_api.py

from flask import Flask, request, jsonify
from flask_cors import CORS
from ytmusicapi import YTMusic
import logging

app = Flask(__name__)
CORS(app)

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize YTMusic once
try:
    ytmusic = YTMusic()
    logger.info("YTMusic initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize YTMusic: {e}")
    ytmusic = None


@app.route('/api/music/search-artist', methods=['GET'])
def search_artist():
    """
    Search for artist by partial name
    Returns first matching artist
    
    Example: /api/music/search-artist?q=Joy
    Returns: {"artist": "Joy Division"}
    """
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify({'artist': None}), 200
    
    if not ytmusic:
        return jsonify({'error': 'YTMusic not initialized'}), 500
    
    try:
        # Search artists
        results = ytmusic.search(query, filter='artists', limit=5)
        
        if results and len(results) > 0:
            # Return first match
            artist_name = results[0].get('artist', '')
            logger.info(f"Artist search '{query}' -> '{artist_name}'")
            return jsonify({'artist': artist_name})
        
        logger.info(f"Artist search '{query}' -> no results")
        return jsonify({'artist': None})
        
    except Exception as e:
        logger.error(f"Error searching artist: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/music/search-track', methods=['GET'])
def search_track():
    """
    Search for track by artist and partial track name
    
    Example: /api/music/search-track?artist=Joy Division&q=Atmos
    Returns: {"track": "Atmosphere"}
    """
    artist = request.args.get('artist', '').strip()
    query = request.args.get('q', '').strip()
    
    if not artist or not query:
        return jsonify({'track': None}), 200
    
    if not ytmusic:
        return jsonify({'error': 'YTMusic not initialized'}), 500
    
    try:
        # Search for songs with artist + track query
        search_query = f"{artist} {query}"
        results = ytmusic.search(search_query, filter='songs', limit=10)
        
        # Find best match
        for result in results:
            result_artist = result.get('artists', [{}])[0].get('name', '') if result.get('artists') else ''
            result_title = result.get('title', '')
            
            # Check if artist matches and track starts with query
            if artist.lower() in result_artist.lower() and result_title.lower().startswith(query.lower()):
                logger.info(f"Track search '{artist}' + '{query}' -> '{result_title}'")
                return jsonify({'track': result_title})
        
        logger.info(f"Track search '{artist}' + '{query}' -> no results")
        return jsonify({'track': None})
        
    except Exception as e:
        logger.error(f"Error searching track: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/music/get-stream', methods=['GET'])
def get_stream():
    """
    Get streaming URL for a specific artist + track
    
    Example: /api/music/get-stream?artist=Joy Division&track=Atmosphere
    Returns: {"streamUrl": "https://...", "videoId": "..."}
    """
    artist = request.args.get('artist', '').strip()
    track = request.args.get('track', '').strip()
    
    if not artist or not track:
        return jsonify({'streamUrl': None}), 200
    
    if not ytmusic:
        return jsonify({'error': 'YTMusic not initialized'}), 500
    
    try:
        # Search for exact song
        search_query = f"{artist} {track}"
        results = ytmusic.search(search_query, filter='songs', limit=5)
        
        # Find exact match
        video_id = None
        for result in results:
            result_artist = result.get('artists', [{}])[0].get('name', '') if result.get('artists') else ''
            result_title = result.get('title', '')
            
            # Exact match check (case insensitive)
            if (artist.lower() == result_artist.lower() and 
                track.lower() == result_title.lower()):
                video_id = result.get('videoId')
                break
        
        if not video_id:
            # If no exact match, take first result
            if results and len(results) > 0:
                video_id = results[0].get('videoId')
        
        if video_id:
            # Extract direct audio URL using yt-dlp
            import yt_dlp
            
            ydl_opts = {
                'format': 'bestaudio/best',
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
            }
            
            youtube_url = f"https://www.youtube.com/watch?v={video_id}"
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(youtube_url, download=False)
                stream_url = info.get('url')
            
            logger.info(f"Stream for '{artist}' - '{track}' -> {video_id}")
            return jsonify({
                'streamUrl': stream_url,
                'videoId': video_id
            })
        
        logger.info(f"Stream for '{artist}' - '{track}' -> not found")
        return jsonify({'streamUrl': None})
        
    except Exception as e:
        logger.error(f"Error getting stream: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'ytmusic': ytmusic is not None
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)