#!/usr/bin/env python
"""Main entry point to run the Flask API server."""
from app.api.app import app

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=8000)
