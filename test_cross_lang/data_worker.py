import requests

class PythonWorker:
    def fetch_data_from_js(self):
        # Python acting as the Frontend Consumer
        print("Calling JS Backend...")
        
        response = requests.get('http://localhost:3000/api/cross-language-test/{id}')
        return response.json()