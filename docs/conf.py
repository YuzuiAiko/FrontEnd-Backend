import os
import sys
from datetime import datetime

# Add project root to path so autodoc can import modules if needed
sys.path.insert(0, os.path.abspath('..'))

project = 'Imfrisiv Mail'
author = 'SiFri Mail contributors'
year = datetime.now().year
copyright = f"{year}, {author}"

extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.napoleon',
]

templates_path = ['_templates']
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

html_theme = 'sphinx_rtd_theme'
html_static_path = ['_static']

# Minimal settings so RTD can build
master_doc = 'index'
