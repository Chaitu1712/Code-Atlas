import requests

class PythonWorker:
    def fetch_data_from_js(self):
        # Python acting as the Frontend Consumer
        print("Calling JS Backend...")
        
        response = requests.get('http://localhost:3000/api/cross-language-test/{id}')
        return response.json()
    def fibonacci(self, n):
        if n <= 1: return n
        return self.fibonacci(n-1) + self.fibonacci(n-2)