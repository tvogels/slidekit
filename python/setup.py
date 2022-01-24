from setuptools import setup

setup(
    name="slides",
    version="0.1",
    description="",
    url="https://github.com/tvogels/slides",
    author="Thijs Vogels",
    author_email="thijs.vogels@epfl.ch",
    license="MIT",
    packages=["slides"],
    install_requires=[],
    entry_points={
        "console_scripts": [
            "sketch2pdf=slides.sketch2pdf:main",
        ]
    },
)
