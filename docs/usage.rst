Usage
=====

Start services using the provided scripts or manually:

- Start everything (powershell): ``./run.ps1``
- Manually: start classifier, backend, and frontend separately. See the project's `tasks` in the workspace for convenience.

Access the app (defaults):

- Frontend: ``https://localhost:5002``
- Backend: ``https://localhost:5000``

Train classifier (optional):

```
cd backend/classifier
python train_model.py
```
