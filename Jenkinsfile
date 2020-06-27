def git_url = 'https://github.com/ashishmaurya/initedit-note-ui.git'
def git_branch = 'master'

pipeline
{
    options {
        timeout(time: 10, unit: 'MINUTES') 
    }
    agent{
        label 'lp-knode-02'
    }
    stages
    {
        /*stage('Git-checkout')
        {
            steps
            {
                git credentialsId: 'github', url: git_url , branch: git_branch
            }
        }*/
        
        stage('Sonarqube-anaylysis')
        {
            steps
            {
                    sh '''
                    echo "sonarqube analysis"
                    '''
            }
        }
        
        stage('Build')
        {
            
            steps
            {
                sh '''
                npm install
                ng build --prod
                '''
            }
        }
        
        stage('Deploy')
        {
            steps
            {
                sh '''
                cd dist
                rsync -parv -e "ssh -o StrictHostKeyChecking=no" ./NoteUI/ admin@test.note.initedit.com:/home/admin/web/test.note.initedit.com/public_html/
                '''
            }
        }
        
        stage('Smoke-test')
        {
            agent{
                label 'web1'
            }
            steps
            {
                sh '''
                ab -n 10 -c 2 -s 60 https://test.note.initedit.com/
            '''
            }
        }
    }
}
