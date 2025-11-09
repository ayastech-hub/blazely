#!/bin/bash
# Example run instructions
export MONGO_URI=mongodb://localhost:27017
uvicorn app.main:app --reload
