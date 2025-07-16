import subprocess

def git_commit_push(commit_message="Atualização automática dos scripts ETL"):
    try:
        subprocess.run(["git", "add", "."], check=True)
        subprocess.run(["git", "commit", "-m", commit_message], check=True)
        subprocess.run(["git", "push"], check=True)
        print("✔️ Commit e push realizados com sucesso!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro ao executar comandos Git: {e}")

if __name__ == "__main__":
    git_commit_push()